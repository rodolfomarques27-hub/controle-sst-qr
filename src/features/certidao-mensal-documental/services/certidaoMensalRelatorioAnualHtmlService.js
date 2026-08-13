import {
    MESES_RELATORIO_ANUAL_CERTIDAO,
    normalizarAnoRelatorioAnualCertidao,
} from "./certidaoMensalRelatorioAnualDataService.js";

const EMPRESAS_MAXIMAS_POR_PAGINA = 7;

function textoSeguro(valor, limite = 500) {
    return String(valor ?? "")
        .trim()
        .slice(0, limite);
}

function normalizarNumero(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return null;
    }

    return Math.max(0, Math.round(numero));
}

function criarDataReferencia(valor) {
    const data = valor instanceof Date
        ? new Date(valor.getTime())
        : new Date(valor || Date.now());

    return Number.isNaN(data.getTime())
        ? new Date()
        : data;
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatarDataHoraRelatorio(valor) {
    const data = criarDataReferencia(valor);

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(data);
}

function obterIniciaisEmpresa(nome) {
    const partes = textoSeguro(nome, 220)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    return partes
        .map((parte) => parte.charAt(0).toUpperCase())
        .join("") || "EM";
}

const ALTURA_CONTEUDO_MULTIOBRA_MM = 165;
const ALTURA_RESUMO_OBRA_MM = 12;
const ALTURA_EMPRESA_MULTIOBRA_MM = 20;
const GAP_RESUMO_EMPRESAS_MM = 1.2;
const GAP_ENTRE_EMPRESAS_MM = 1.2;
const GAP_ENTRE_OBRAS_MM = 2.2;

function calcularAlturaBlocoObraMm(quantidadeEmpresas) {
    const quantidade =
        Math.max(
            0,
            Number(quantidadeEmpresas) || 0,
        );

    if (quantidade === 0) {
        return ALTURA_RESUMO_OBRA_MM;
    }

    return (
        ALTURA_RESUMO_OBRA_MM +
        GAP_RESUMO_EMPRESAS_MM +
        (
            quantidade *
            ALTURA_EMPRESA_MULTIOBRA_MM
        ) +
        (
            Math.max(
                0,
                quantidade - 1,
            ) *
            GAP_ENTRE_EMPRESAS_MM
        )
    );
}

function calcularQuantidadeEmpresasQueCabemMm(
    espacoDisponivelMm,
) {
    const disponivelEmpresas =
        (
            Number(espacoDisponivelMm) || 0
        ) -
        ALTURA_RESUMO_OBRA_MM -
        GAP_RESUMO_EMPRESAS_MM;

    if (
        disponivelEmpresas <
        ALTURA_EMPRESA_MULTIOBRA_MM
    ) {
        return 0;
    }

    return Math.max(
        0,
        Math.floor(
            (
                disponivelEmpresas +
                GAP_ENTRE_EMPRESAS_MM
            ) /
            (
                ALTURA_EMPRESA_MULTIOBRA_MM +
                GAP_ENTRE_EMPRESAS_MM
            ),
        ),
    );
}

function distribuirObrasEmPaginas(obras) {
    const listaObras =
        Array.isArray(obras)
            ? obras.filter(
                (obra) =>
                    obra &&
                    typeof obra === "object" &&
                    Array.isArray(obra.empresas) &&
                    obra.empresas.length > 0,
            )
            : [];

    if (listaObras.length === 0) {
        return [];
    }

    const paginas = [];

    let paginaAtual = {
        blocos: [],
        alturaUsadaMm: 0,
    };

    const finalizarPagina = () => {
        if (
            paginaAtual.blocos.length === 0
        ) {
            return;
        }

        paginas.push(
            paginaAtual,
        );

        paginaAtual = {
            blocos: [],
            alturaUsadaMm: 0,
        };
    };

    listaObras.forEach((obra) => {
        const empresasObra =
            obra.empresas;

        let inicio =
            0;

        while (
            inicio <
            empresasObra.length
        ) {
            const possuiBlocoAnterior =
                paginaAtual.blocos.length > 0;

            const gapAntes =
                possuiBlocoAnterior
                    ? GAP_ENTRE_OBRAS_MM
                    : 0;

            const espacoDisponivel =
                ALTURA_CONTEUDO_MULTIOBRA_MM -
                paginaAtual.alturaUsadaMm -
                gapAntes;

            const quantidadeQueCabe =
                calcularQuantidadeEmpresasQueCabemMm(
                    espacoDisponivel,
                );

            if (
                quantidadeQueCabe <= 0
            ) {
                finalizarPagina();
                continue;
            }

            const quantidade =
                Math.min(
                    quantidadeQueCabe,
                    empresasObra.length -
                    inicio,
                );

            const empresasPagina =
                empresasObra.slice(
                    inicio,
                    inicio + quantidade,
                );

            const alturaBloco =
                calcularAlturaBlocoObraMm(
                    empresasPagina.length,
                );

            paginaAtual.blocos.push({
                obra,
                empresas:
                    empresasPagina,
                totais:
                    obra.totais || {},
                continuacao:
                    inicio > 0,
            });

            paginaAtual.alturaUsadaMm +=
                gapAntes +
                alturaBloco;

            inicio +=
                quantidade;

            if (
                inicio <
                empresasObra.length
            ) {
                finalizarPagina();
            }
        }
    });

    finalizarPagina();

    return paginas;
}
function distribuirEmpresasEmPaginas(empresas) {
    const lista = Array.isArray(empresas)
        ? empresas
        : [];

    if (lista.length === 0) {
        return [[]];
    }

    const paginas = [];

    for (
        let inicio = 0;
        inicio < lista.length;
        inicio += EMPRESAS_MAXIMAS_POR_PAGINA
    ) {
        paginas.push(
            lista.slice(
                inicio,
                inicio + EMPRESAS_MAXIMAS_POR_PAGINA,
            ),
        );
    }

    return paginas;
}

function montarMarcaSafeScan() {
    return `
        <div class="marca-safescan" aria-label="SafeScan Brasil">
            <svg
                class="marca-safescan__simbolo"
                viewBox="0 0 48 48"
                role="img"
                aria-hidden="true"
            >
                <rect x="3" y="3" width="42" height="42" rx="12" fill="none" stroke="#ffffff" stroke-width="3.5" />
                <path d="M14 25.5 21 32l13-17" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>

            <span class="marca-safescan__texto">
                <strong>SAFESCAN</strong>
                <small>BRASIL</small>
            </span>
        </div>
    `;
}

function montarIconeResumo(tipo) {
    if (tipo === "ano") {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="#ffffff" stroke-width="2" />
                <path d="M7 3v4M17 3v4M3 10h18" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
            </svg>
        `;
    }

    if (tipo === "conforme") {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" fill="none" stroke="#ffffff" stroke-width="2" />
                <path d="m8 12 2.6 2.7L16.5 9" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;
    }

    return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="#ffffff" stroke-width="2" />
            <path d="M12 7.5v6M12 17h.01" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />
        </svg>
    `;
}

function montarLogoEmpresa(empresa) {
    if (empresa.logoUrl) {
        return `
            <img
                class="empresa-logo__imagem"
                src="${escaparHtml(empresa.logoUrl)}"
                alt="Logo ${escaparHtml(empresa.nome)}"
            >
        `;
    }

    return `
        <span class="empresa-logo__iniciais">
            ${escaparHtml(obterIniciaisEmpresa(empresa.nome))}
        </span>
    `;
}

function montarCelulaGrade({
    conteudo,
    classes = "",
    papel = "cell",
}) {
    return `
        <div class="grade-celula ${classes}" role="${papel}">
            ${conteudo}
        </div>
    `;
}

function montarCelulaMes(valor, classe, ultimaLinha = false) {
    const semResultado = !Number.isFinite(valor);

    return montarCelulaGrade({
        conteudo: semResultado
            ? "&mdash;"
            : escaparHtml(valor),
        classes: [
            "valor-mes",
            classe,
            semResultado
                ? "is-sem-resultado"
                : "",
            ultimaLinha
                ? "is-ultima-linha"
                : "",
        ].filter(Boolean).join(" "),
    });
}

function empresaEhSubcontratada(empresa = {}) {
    const tipoEmpresa = String(
        empresa?.tipoEmpresa ||
        empresa?.tipo_empresa ||
        "",
    )
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    return tipoEmpresa.includes(
        "subcontrat",
    );
}

function montarEmpresaHtml(empresa) {
    const cabecalhoMeses = MESES_RELATORIO_ANUAL_CERTIDAO
        .map((mes) => montarCelulaGrade({
            conteudo: escaparHtml(mes.rotulo),
            classes: "grade-cabecalho",
            papel: "columnheader",
        }))
        .join("");
    const celulasConforme = empresa.meses
        .map((mes) => montarCelulaMes(
            mes.conformes,
            "valor-mes--conforme linha-conforme",
        ))
        .join("");
    const celulasPendente = empresa.meses
        .map((mes) => montarCelulaMes(
            mes.pendentes,
            "valor-mes--pendente linha-pendente",
            true,
        ))
        .join("");
    const totalConformes = Number.isFinite(empresa.totalConformes)
        ? empresa.totalConformes
        : "—";
    const totalPendentes = Number.isFinite(empresa.totalPendentes)
        ? empresa.totalPendentes
        : "—";

    const empresaPaiNome =
        textoSeguro(
            empresa?.empresaPaiNome ||
            empresa?.empresa_pai_nome ||
            "",
            300,
        );

    const empresaPaiNomeExibicao =
        empresaPaiNome ||
        "Empresa não identificada";

    const identificacaoSubHtml =
        empresaEhSubcontratada(
            empresa,
        )
            ? `
                <p
                    class="empresa-sub-linha"
                    title="Subcontratada de ${escaparHtml(empresaPaiNomeExibicao)}"
                    aria-label="Subcontratada de ${escaparHtml(empresaPaiNomeExibicao)}"
                >
                    <strong>SUB:</strong>
                    <span>${escaparHtml(empresaPaiNomeExibicao)}</span>
                </p>
            `
            : "";

    return `
        <article class="empresa-card">
            <section class="empresa-identidade">
                <div class="empresa-logo">
                    ${montarLogoEmpresa(empresa)}
                </div>

                <div class="empresa-dados">
                    <h2 title="${escaparHtml(empresa.nome)}">${escaparHtml(empresa.nome)}</h2>
                    <p>CNPJ ${escaparHtml(empresa.cnpj)}</p>
                    <p>Funcionários: <strong>${escaparHtml(empresa.funcionarios)}</strong></p>

                    ${identificacaoSubHtml}
                </div>
            </section>

            <section class="empresa-matriz">
                <div
                    class="empresa-grade"
                    role="table"
                    aria-label="Situação anual de ${escaparHtml(empresa.nome)}"
                >
                    ${montarCelulaGrade({
                        conteudo: "Situação",
                        classes: "grade-cabecalho grade-cabecalho--status",
                        papel: "columnheader",
                    })}
                    ${cabecalhoMeses}
                    ${montarCelulaGrade({
                        conteudo: "Total",
                        classes: "grade-cabecalho grade-cabecalho--total is-ultima-coluna",
                        papel: "columnheader",
                    })}

                    ${montarCelulaGrade({
                        conteudo: "Conforme",
                        classes: "linha-status linha-status--conforme linha-conforme",
                        papel: "rowheader",
                    })}
                    ${celulasConforme}
                    ${montarCelulaGrade({
                        conteudo: escaparHtml(totalConformes),
                        classes: "valor-total valor-total--conforme linha-conforme is-ultima-coluna",
                    })}

                    ${montarCelulaGrade({
                        conteudo: "Pendente",
                        classes: "linha-status linha-status--pendente linha-pendente is-ultima-linha",
                        papel: "rowheader",
                    })}
                    ${celulasPendente}
                    ${montarCelulaGrade({
                        conteudo: escaparHtml(totalPendentes),
                        classes: "valor-total valor-total--pendente linha-pendente is-ultima-coluna is-ultima-linha",
                    })}
                </div>
            </section>
        </article>
    `;
}

function montarResumoObraHtml(obra, continuacao = false) {
    if (!obra || typeof obra !== "object") {
        return "";
    }

    const contratante =
        obra.contratante &&
        typeof obra.contratante === "object"
            ? obra.contratante
            : null;

    const contratanteVisual =
        contratante || {
            nome: "Contratante não identificada",
            logoUrl: "",
        };

    const nomeContratante =
        textoSeguro(
            contratanteVisual.nome ||
            contratanteVisual.razaoSocial ||
            contratanteVisual.razao_social ||
            "Contratante não identificada",
            300,
        );

    const cnpjContratante =
        textoSeguro(
            contratanteVisual.cnpj ||
            contratanteVisual.documento,
            80,
        );

    const nomeObra =
        textoSeguro(
            obra.nome ||
            obra.nomeObra ||
            obra.nome_obra ||
            "SEM OBRA VINCULADA",
            300,
        );

    const numeroObra =
        textoSeguro(
            obra.numeroObra ||
            obra.numero_obra,
            120,
        );

    const identificacaoObraBase =
        numeroObra
            ? `${nomeObra} • Nº ${numeroObra}`
            : nomeObra;

    const identificacaoObra =
        continuacao
            ? `${identificacaoObraBase} • continuação`
            : identificacaoObraBase;

    return `
        <article
            class="resumo-card resumo-card--obra"
            aria-label="Obra e empresa contratante"
        >
            <div class="empresa-logo resumo-obra-logo">
                ${montarLogoEmpresa(contratanteVisual)}
            </div>

            <span class="resumo-obra__texto">
                <small class="resumo-obra__rotulo">
                    CONTRATANTE${cnpjContratante
                        ? ` • ${escaparHtml(cnpjContratante)}`
                        : ""}
                </small>

                <strong>
                    ${escaparHtml(nomeContratante)}
                </strong>

                <small class="resumo-obra__obra">
                    Obra: ${escaparHtml(identificacaoObra)}
                </small>
            </span>
        </article>
    `;
}

function montarResumoHtml({
    ano,
    percentualConforme,
    percentualPendente,
    obra = null,
    continuacao = false,
}) {
    const possuiObra =
        obra &&
        typeof obra === "object";

    return `
        <section
            class="resumo-anual${possuiObra
                ? " resumo-anual--com-obra"
                : ""}"
            aria-label="${possuiObra
                ? "Situação anual da obra"
                : "Situação anual consolidada"}"
        >
            ${montarResumoObraHtml(obra, continuacao)}

            <article class="resumo-card resumo-card--ano">
                <span class="resumo-card__icone">
                    ${montarIconeResumo("ano")}
                </span>

                <span class="resumo-card__texto">
                    <small>Ano de referência</small>
                    <strong>${escaparHtml(ano)}</strong>
                </span>
            </article>

            <article class="resumo-card resumo-card--conforme">
                <span class="resumo-card__icone">
                    ${montarIconeResumo("conforme")}
                </span>

                <span class="resumo-card__texto">
                    <small>Conforme</small>
                    <strong>${escaparHtml(percentualConforme)}%</strong>
                </span>
            </article>

            <article class="resumo-card resumo-card--pendente">
                <span class="resumo-card__icone">
                    ${montarIconeResumo("pendente")}
                </span>

                <span class="resumo-card__texto">
                    <small>Pendente</small>
                    <strong>${escaparHtml(percentualPendente)}%</strong>
                </span>
            </article>
        </section>
    `;
}

function montarPaginaHtml({
    empresas,
    pagina,
    totalPaginas,
    ano,
    percentualConforme,
    percentualPendente,
    geradoEm,
    obra = null,
}) {
    const empresasHtml = empresas.length > 0
        ? empresas.map(montarEmpresaHtml).join("")
        : `
            <section class="estado-vazio">
                Nenhuma empresa fiscalizável foi localizada para este relatório.
            </section>
        `;

    return `
        <article class="pagina-relatorio">
            <header class="cabecalho-relatorio">
                ${montarMarcaSafeScan()}

                <div class="titulo-relatorio">
                    <h1>Relatório Anual de Pendências Documentais</h1>
                    <p>Visão anual por empresa</p>
                </div>
            </header>

            ${montarResumoHtml({
                ano,
                percentualConforme,
                percentualPendente,
                obra,
            })}

            <section
                class="empresas"
                style="--empresas-na-pagina: ${Math.max(1, empresas.length)}"
            >
                ${empresasHtml}
            </section>

            <footer class="rodape-relatorio">
                <span>Gerado pelo SafeScan Brasil</span>
                <span>${escaparHtml(formatarDataHoraRelatorio(geradoEm))}</span>
                <span>Página ${pagina} de ${totalPaginas}</span>
            </footer>
        </article>
    `;
}

function montarBlocoObraPaginaHtml({
    obra,
    empresas,
    totais,
    ano,
    continuacao = false,
}) {
    const listaEmpresas =
        Array.isArray(empresas)
            ? empresas
            : [];

    const totaisBloco =
        totais || {};

    const percentualConforme =
        normalizarNumero(
            totaisBloco.percentualConforme,
        ) ?? 0;

    const percentualPendente =
        normalizarNumero(
            totaisBloco.percentualPendente,
        ) ?? 0;

    const empresasHtml =
        listaEmpresas
            .map(montarEmpresaHtml)
            .join("");

    return `
        <section
            class="obra-bloco"
            data-obra-id="${escaparHtml(
                obra?.id || "",
            )}"
        >
            ${montarResumoHtml({
                ano,
                percentualConforme,
                percentualPendente,
                obra,
                continuacao,
            })}

            <section class="empresas">
                ${empresasHtml}
            </section>
        </section>
    `;
}

function montarPaginaMultiObraHtml({
    blocos,
    pagina,
    totalPaginas,
    ano,
    geradoEm,
}) {
    const listaBlocos =
        Array.isArray(blocos)
            ? blocos
            : [];

    const blocosHtml =
        listaBlocos
            .map((bloco) =>
                montarBlocoObraPaginaHtml({
                    obra:
                        bloco.obra,
                    empresas:
                        bloco.empresas,
                    totais:
                        bloco.totais,
                    ano,
                    continuacao:
                        Boolean(
                            bloco.continuacao,
                        ),
                }),
            )
            .join("");

    return `
        <article
            class="pagina-relatorio"
            data-modo="multiobra"
        >
            <header class="cabecalho-relatorio">
                ${montarMarcaSafeScan()}

                <div class="titulo-relatorio">
                    <h1>Relatório Anual de Pendências Documentais</h1>
                    <p>Visão anual por empresa</p>
                </div>
            </header>

            <section class="pagina-conteudo-obras">
                ${blocosHtml}
            </section>

            <footer class="rodape-relatorio">
                <span>Gerado pelo SafeScan Brasil</span>
                <span>${escaparHtml(formatarDataHoraRelatorio(geradoEm))}</span>
                <span>Página ${pagina} de ${totalPaginas}</span>
            </footer>
        </article>
    `;
}
export function gerarHtmlRelatorioAnualCertidaoMensal(dados) {
    const relatorio = dados && typeof dados === "object"
        ? dados
        : {};
    const ano = normalizarAnoRelatorioAnualCertidao(
        relatorio.ano,
    );
    const empresas = Array.isArray(relatorio.empresas)
        ? relatorio.empresas
        : [];

    const totais = relatorio.totais || {};

    /*
     * Mantemos a paginação antiga como fallback.
     * Isso preserva o comportamento do relatório caso um objeto
     * antigo seja enviado sem a propriedade "obras".
     */
    const paginasSemObra =
        distribuirEmpresasEmPaginas(empresas);

    const obras =
        Array.isArray(relatorio.obras)
            ? relatorio.obras.filter(
                (obra) =>
                    obra &&
                    typeof obra === "object",
            )
            : [];

    /*
     * Sem agrupamento de obras:
     * mantém a paginação histórica do relatório.
     *
     * Com obras:
     * utiliza a altura física disponível do A4 para permitir
     * mais de uma frente de trabalho na mesma folha.
     */
    const paginasMultiobra =
        obras.length > 0
            ? distribuirObrasEmPaginas(
                obras,
            )
            : [];

    const usandoMultiobra =
        paginasMultiobra.length > 0;

    const totalPaginas =
        usandoMultiobra
            ? paginasMultiobra.length
            : Math.max(
                1,
                paginasSemObra.length,
            );

    const paginasHtml =
        usandoMultiobra
            ? paginasMultiobra
                .map(
                    (
                        paginaMultiobra,
                        indice,
                    ) =>
                        montarPaginaMultiObraHtml({
                            blocos:
                                paginaMultiobra.blocos,
                            pagina:
                                indice + 1,
                            totalPaginas,
                            ano,
                            geradoEm:
                                relatorio.geradoEm,
                        }),
                )
                .join("")
            : paginasSemObra
                .map(
                    (
                        empresasPagina,
                        indice,
                    ) => {
                        const percentualConforme =
                            normalizarNumero(
                                totais
                                    .percentualConforme,
                            ) ?? 0;

                        const percentualPendente =
                            normalizarNumero(
                                totais
                                    .percentualPendente,
                            ) ?? 0;

                        return montarPaginaHtml({
                            empresas:
                                empresasPagina,
                            pagina:
                                indice + 1,
                            totalPaginas,
                            ano,
                            percentualConforme,
                            percentualPendente,
                            geradoEm:
                                relatorio.geradoEm,
                            obra: null,
                        });
                    },
                )
                .join("");

    return `<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Relatório Anual de Pendências Documentais - ${escaparHtml(ano)}</title>

    <style>
        :root {
            color-scheme: light;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #10251c;
            background: #edf2ef;
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            margin: 0;
            min-height: 100%;
            background: #edf2ef;
        }

        body {
            padding: 18px;
        }

        .relatorio {
            display: grid;
            gap: 18px;
            width: min(1180px, 100%);
            margin: 0 auto;
        }

        .pagina-relatorio {
            display: grid;
            width: 100%;
            aspect-ratio: 297 / 210;
            min-height: 0;
            grid-template-rows: 88px 58px minmax(0, 1fr) 24px;
            gap: 12px;
            overflow: hidden;
            border: 1px solid #d2dfd8;
            border-radius: 16px;
            padding: 18px 22px 14px;
            background: #ffffff;
            box-shadow: 0 18px 52px rgba(9, 52, 34, 0.13);
        }

        .cabecalho-relatorio {
            display: grid;
            width: 100%;
            height: 88px;
            min-height: 88px;
            grid-template-columns: minmax(210px, 0.68fr) minmax(0, 2.32fr);
            align-items: center;
            gap: 26px;
            overflow: hidden;
            border-radius: 12px;
            padding: 0 24px;
            color: #ffffff;
            background-color: #063e32;
            background-image:
                linear-gradient(
                    108deg,
                    rgba(4, 25, 34, 0.82) 0%,
                    rgba(5, 61, 49, 0.70) 48%,
                    rgba(7, 131, 62, 0.56) 100%
                ),
                url("data:image/webp;base64,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");
            background-repeat: no-repeat;
            background-position: 50% 50%;
            background-size: cover;
        }

        .marca-safescan {
            display: flex;
            height: 100%;
            align-items: center;
            justify-content: flex-start;
            gap: 12px;
        }

        .marca-safescan__simbolo {
            width: 50px;
            height: 50px;
            flex: 0 0 50px;
            color: #ffffff;
        }

        .marca-safescan__texto {
            display: grid;
            line-height: 1;
        }

        .marca-safescan__texto strong {
            font-size: 23px;
            letter-spacing: 0.025em;
        }

        .marca-safescan__texto small {
            margin-top: 5px;
            font-size: 12px;
            letter-spacing: 0.18em;
        }

        .titulo-relatorio {
            display: flex;
            height: 100%;
            min-width: 0;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding-right: 0;
            text-align: center;
        }

        .titulo-relatorio h1 {
            margin: 0;
            font-size: clamp(26px, 2.3vw, 38px);
            line-height: 1.08;
            letter-spacing: -0.032em;
            white-space: nowrap;
        }

        .titulo-relatorio p {
            margin: 6px 0 0;
            font-size: 16px;
            font-weight: 650;
            opacity: 0.92;
        }

        .resumo-anual {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
        }

        .resumo-card {
            display: grid;
            min-height: 58px;
            grid-template-columns: auto auto;
            align-items: center;
            justify-content: center;
            align-content: center;
            column-gap: 9px;
            overflow: hidden;
            border: 1px solid transparent;
            border-radius: 10px;
            padding: 8px 12px;
            color: #ffffff !important;
            box-shadow: 0 7px 18px rgba(20, 48, 35, 0.12);
        }

        .resumo-card--ano {
            border-color: #174b41;
            background: linear-gradient(110deg, #092631, #0b4a3e);
        }

        .resumo-card--conforme {
            border-color: #0d8a42;
            background: linear-gradient(110deg, #087c36, #18a34b);
        }

        .resumo-card--pendente {
            border-color: #db1823;
            background: linear-gradient(110deg, #d90f1c, #f2222c);
        }

        .resumo-card__icone {
            display: grid;
            width: 32px;
            height: 32px;
            flex: 0 0 32px;
            place-items: center;
            color: #ffffff !important;
        }

        .resumo-card__icone svg {
            width: 28px;
            height: 28px;
        }

        .resumo-card__texto {
            display: flex;
            min-width: 0;
            flex: 0 1 auto;
            align-items: baseline;
            justify-content: center;
            justify-self: center;
            align-self: center;
            gap: 6px;
            color: #ffffff !important;
            line-height: 1;
            text-align: center;
            white-space: nowrap;
        }

        .resumo-card__texto small {
            color: #ffffff !important;
            font-size: 11px;
            font-weight: 750;
            line-height: 1;
            opacity: 0.92;
            white-space: nowrap;
        }

        .resumo-card__texto strong {
            margin-top: 0;
            color: #ffffff !important;
            font-size: 19px;
            font-weight: 950;
            line-height: 1;
            white-space: nowrap;
        }

                /*
         * Acabamento final do relatório anual.
         * O texto dos três indicadores permanece matematicamente
         * centralizado mesmo com o ícone na lateral.
         */
        .cabecalho-relatorio {
            background-repeat: no-repeat, no-repeat;
            background-position: center, 88% 50%;
            background-size: cover, auto 175%;
        }

        .resumo-card--ano,
        .resumo-card--conforme,
        .resumo-card--pendente {
            display: grid;
            grid-template-columns:
                minmax(0, 1fr)
                auto
                minmax(0, 1fr);
            align-items: center;
            column-gap: 0;
        }

        .resumo-card--ano > .resumo-card__icone,
        .resumo-card--conforme > .resumo-card__icone,
        .resumo-card--pendente > .resumo-card__icone {
            grid-column: 1;
            grid-row: 1;
            width: 26px;
            height: 26px;
            justify-self: start;
            align-self: center;
        }

        .resumo-card--ano > .resumo-card__icone svg,
        .resumo-card--conforme > .resumo-card__icone svg,
        .resumo-card--pendente > .resumo-card__icone svg {
            width: 23px;
            height: 23px;
        }

        .resumo-card--ano > .resumo-card__texto,
        .resumo-card--conforme > .resumo-card__texto,
        .resumo-card--pendente > .resumo-card__texto {
            grid-column: 2;
            grid-row: 1;
            display: flex;
            width: max-content;
            max-width: 100%;
            align-items: baseline;
            justify-content: center;
            justify-self: center;
            align-self: center;
            gap: 5px;
            white-space: nowrap;
            text-align: center;
        }

        .resumo-card--ano > .resumo-card__texto small,
        .resumo-card--conforme > .resumo-card__texto small,
        .resumo-card--pendente > .resumo-card__texto small {
            font-size: 10px;
        }

        .resumo-card--ano > .resumo-card__texto strong,
        .resumo-card--conforme > .resumo-card__texto strong,
        .resumo-card--pendente > .resumo-card__texto strong {
            margin-top: 0;
            font-size: 18px;
        }

        .empresa-sub-linha {
            display: flex;
            min-width: 0;
            align-items: baseline;
            gap: 4px;
            margin: 3px 0 0;
            color: #64748b;
            font-size: 8px;
            line-height: 1.1;
            white-space: nowrap;
        }

        .empresa-sub-linha strong {
            flex: 0 0 auto;
            color: #c25714;
            font-weight: 950;
            letter-spacing: 0.02em;
        }

        .empresa-sub-linha span {
            min-width: 0;
            overflow: hidden;
            color: #475569;
            font-weight: 750;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

.empresas {
            display: grid;
            min-height: 0;
            grid-template-rows: repeat(7, minmax(0, 1fr));
            align-content: start;
            gap: 5px;
        }

        .empresa-card {
            display: grid;
            min-height: 0;
            grid-template-columns: minmax(250px, 24%) minmax(0, 76%);
            overflow: hidden;
            border: 1px solid #cddbd3;
            border-left: 4px solid #0b8a45;
            border-radius: 10px;
            background: #ffffff;
            box-shadow: 0 5px 15px rgba(14, 58, 38, 0.09);
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .empresa-identidade {
            display: grid;
            min-width: 0;
            grid-template-columns: 68px minmax(0, 1fr);
            align-items: center;
            gap: 10px;
            padding: 6px 10px;
            border-right: 1px solid #d9e3de;
            background: linear-gradient(90deg, #ffffff, #fbfdfc);
        }

        .empresa-logo {
            display: grid;
            width: 60px;
            height: 60px;
            place-items: center;
            overflow: hidden;
            border: 1px solid #cbd9d1;
            border-radius: 10px;
            background: #ffffff;
            box-shadow: inset 0 0 0 3px #f6f9f7;
        }

        .empresa-logo__imagem {
            display: block;
            width: 84%;
            height: 84%;
            object-fit: contain;
        }

        .empresa-logo__iniciais {
            display: grid;
            width: 100%;
            height: 100%;
            place-items: center;
            color: #ffffff;
            background: linear-gradient(135deg, #08763a, #13a14a);
            font-size: 20px;
            font-weight: 950;
            letter-spacing: 0.04em;
        }

        .empresa-dados {
            min-width: 0;
        }

        .empresa-dados h2 {
            display: block;
            max-width: 100%;
            margin: 0 0 3px;
            overflow: hidden;
            color: #102b21;
            font-size: 12px;
            line-height: 1.15;
            text-overflow: ellipsis;
            text-transform: uppercase;
            white-space: nowrap;
        }

        .empresa-dados p {
            margin: 2px 0 0;
            color: #40534a;
            font-size: 9.5px;
            line-height: 1.16;
        }

        .empresa-matriz {
            min-width: 0;
            overflow: visible;
        }

        .empresa-grade {
            display: grid;
            width: 100%;
            height: 100%;
            grid-template-columns: 84px repeat(12, minmax(0, 1fr)) 54px;
            grid-template-rows: repeat(3, minmax(0, 1fr));
        }

        .grade-celula {
            display: flex;
            min-width: 0;
            align-items: center;
            justify-content: center;
            border-right: 1px solid #d9e3de;
            border-bottom: 1px solid #d9e3de;
            padding: 2px 1px;
            text-align: center;
            vertical-align: middle;
            font-size: 10px;
            line-height: 1;
        }

        .is-ultima-coluna {
            border-right: 0;
        }

        .is-ultima-linha {
            border-bottom: 0;
        }

        .grade-cabecalho {
            color: #173327;
            background: #e8f0ec;
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
        }

        .grade-cabecalho--status {
            color: #365146;
            background: #e5ede9;
            font-size: 8.5px;
            letter-spacing: 0.02em;
        }

        .grade-cabecalho--total {
            background: #dce8e1;
        }

        .linha-conforme {
            background: #f3faf5;
        }

        .linha-pendente {
            background: #fff5f5;
        }

        .linha-status {
            justify-content: center;
            padding-inline: 3px;
            font-size: 10px;
            font-weight: 900;
            text-align: center;
        }

        .linha-status--conforme,
        .valor-mes--conforme,
        .valor-total--conforme {
            color: #087c36;
        }

        .linha-status--pendente,
        .valor-mes--pendente,
        .valor-total--pendente {
            color: #e31320;
        }

        .valor-mes,
        .valor-total {
            font-size: 10px;
            font-weight: 900;
        }

        .valor-total {
            background: #eef4f0;
            font-size: 11px;
            box-shadow: inset 2px 0 0 #c5d4cc;
        }

        .is-sem-resultado {
            color: #99a59f !important;
            background: #f8faf9 !important;
            font-weight: 700;
        }

        .estado-vazio {
            display: grid;
            min-height: 180px;
            place-items: center;
            border: 1px dashed #b7c6bd;
            border-radius: 10px;
            color: #607168;
            background: #f9fbfa;
            font-weight: 800;
        }

        .rodape-relatorio {
            display: grid;
            grid-template-columns: 1fr auto auto;
            align-items: center;
            gap: 18px;
            border-top: 1px solid #d5e0da;
            padding-top: 8px;
            color: #63736a;
            font-size: 10px;
            font-weight: 750;
        }

        @media (max-width: 900px) {
            body {
                padding: 8px;
            }

            .pagina-relatorio {
                aspect-ratio: auto;
                grid-template-rows: auto auto auto auto;
                gap: 8px;
                padding: 10px;
            }

            .empresas {
                grid-template-rows: repeat(var(--empresas-na-pagina), 96px);
            }

            .empresa-card {
                min-height: 96px;
            }

            .cabecalho-relatorio {
                grid-template-columns: 1fr;
                gap: 8px;
                text-align: center;
            }

            .marca-safescan {
                justify-content: center;
            }

            .titulo-relatorio {
                padding-right: 0;
            }

            .empresa-card {
                grid-template-columns: minmax(190px, 29%) minmax(0, 71%);
            }

            .empresa-identidade {
                grid-template-columns: 54px minmax(0, 1fr);
                gap: 8px;
                padding: 7px;
            }

            .empresa-logo {
                width: 48px;
                height: 48px;
            }

            .empresa-grade {
                grid-template-columns: 64px repeat(12, minmax(0, 1fr)) 42px;
            }

            .grade-celula {
                font-size: 8px;
            }
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
                background: #ffffff;
            }

            body {
                padding: 0;
            }

            .relatorio {
                display: block;
                width: 297mm;
                margin: 0;
            }

            .pagina-relatorio {
                width: 297mm;
                height: 210mm;
                min-height: 210mm;
                grid-template-rows: 21mm 12mm minmax(0, 1fr) 6mm;
                gap: 3mm;
                border: 0;
                border-radius: 0;
                padding: 7mm 8mm 5mm;
                box-shadow: none;
                break-after: page;
                page-break-after: always;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .pagina-relatorio:last-child {
                break-after: auto;
                page-break-after: auto;
            }

            .cabecalho-relatorio {
                width: 100%;
                height: 21mm;
                min-height: 21mm;
                grid-template-columns: 52mm 1fr;
                align-items: center;
                gap: 5mm;
                border-radius: 2.5mm;
                padding: 0 5mm;
                background-position: 50% 50%;
                background-size: cover;
            }

            .marca-safescan {
                gap: 2.5mm;
            }

            .marca-safescan__simbolo {
                width: 12mm;
                height: 12mm;
                flex-basis: 12mm;
            }

            .marca-safescan__texto strong {
                font-size: 4.8mm;
            }

            .marca-safescan__texto small {
                margin-top: 1mm;
                font-size: 2.2mm;
            }

            .titulo-relatorio {
                padding-right: 0;
            }

            .titulo-relatorio h1 {
                font-size: 5.2mm;
                white-space: nowrap;
            }

            .titulo-relatorio p {
                margin-top: 1mm;
                font-size: 3mm;
            }

            .resumo-anual {
                gap: 3mm;
            }

            .resumo-card {
                height: 12mm;
                min-height: 12mm;
                gap: 1.5mm;
                border-radius: 2mm;
                padding: 1.3mm 2.6mm;
                box-shadow: 0 0.7mm 1.8mm rgba(20, 48, 35, 0.12);
            }

            .resumo-card__icone {
                width: 5.2mm;
                height: 5.2mm;
                flex: 0 0 5.2mm;
            }

            .resumo-card__icone svg {
                width: 4.8mm;
                height: 4.8mm;
            }

            .resumo-card__texto {
                gap: 1.1mm;
                align-items: baseline;
                justify-content: center;
                white-space: nowrap;
            }

            .resumo-card__texto small {
                font-size: 2.05mm;
                line-height: 1;
                white-space: nowrap;
            }

            .resumo-card__texto strong {
                margin-top: 0;
                font-size: 3.35mm;
                line-height: 1;
                white-space: nowrap;
            }

                        .cabecalho-relatorio {
                background-repeat: no-repeat, no-repeat;
                background-position: center, 88% 50%;
                background-size: cover, auto 170%;
            }

            .resumo-card--ano,
            .resumo-card--conforme,
            .resumo-card--pendente {
                display: grid;
                grid-template-columns:
                    minmax(0, 1fr)
                    auto
                    minmax(0, 1fr);
                align-items: center;
                column-gap: 0;
            }

            .resumo-card--ano > .resumo-card__icone,
            .resumo-card--conforme > .resumo-card__icone,
            .resumo-card--pendente > .resumo-card__icone {
                grid-column: 1;
                grid-row: 1;
                width: 4.8mm;
                height: 4.8mm;
                justify-self: start;
                align-self: center;
            }

            .resumo-card--ano > .resumo-card__icone svg,
            .resumo-card--conforme > .resumo-card__icone svg,
            .resumo-card--pendente > .resumo-card__icone svg {
                width: 4.4mm;
                height: 4.4mm;
            }

            .resumo-card--ano > .resumo-card__texto,
            .resumo-card--conforme > .resumo-card__texto,
            .resumo-card--pendente > .resumo-card__texto {
                grid-column: 2;
                grid-row: 1;
                display: flex;
                width: max-content;
                align-items: baseline;
                justify-content: center;
                justify-self: center;
                align-self: center;
                gap: 0.9mm;
                white-space: nowrap;
            }

            .resumo-card--ano > .resumo-card__texto small,
            .resumo-card--conforme > .resumo-card__texto small,
            .resumo-card--pendente > .resumo-card__texto small {
                font-size: 1.9mm;
            }

            .resumo-card--ano > .resumo-card__texto strong,
            .resumo-card--conforme > .resumo-card__texto strong,
            .resumo-card--pendente > .resumo-card__texto strong {
                margin-top: 0;
                font-size: 3.2mm;
            }

            .empresa-sub-linha {
                min-height: 2.4mm;
                margin-top: 0.55mm;
            }

            .empresa-badge-sub {
                border-width: 0.25mm;
                padding: 0.35mm 1mm;
                font-size: 1.45mm;
            }

            .empresa-sub-linha {
                gap: 0.75mm;
                margin: 0.55mm 0 0;
                font-size: 1.45mm;
                line-height: 1.1;
            }

            .empresa-sub-linha strong {
                font-size: 1.45mm;
            }

            .empresa-sub-linha span {
                font-size: 1.45mm;
            }

.empresas {
                grid-template-rows: repeat(7, minmax(0, 1fr));
                align-content: start;
                gap: 1.2mm;
            }

            .empresa-card {
                grid-template-columns: 61mm minmax(0, 1fr);
                border-width: 0.35mm;
                border-left-width: 1mm;
                border-radius: 2mm;
                box-shadow: 0 0.55mm 1.4mm rgba(14, 58, 38, 0.1);
            }

            .empresa-identidade {
                grid-template-columns: 15mm minmax(0, 1fr);
                gap: 2mm;
                padding: 1.1mm 2.2mm;
            }

            .empresa-logo {
                width: 12mm;
                height: 12mm;
                border-radius: 2mm;
                box-shadow: inset 0 0 0 0.7mm #f6f9f7;
            }

            .empresa-logo__iniciais {
                font-size: 4mm;
            }

            .empresa-dados h2 {
                margin-bottom: 1mm;
                font-size: 2.8mm;
                -webkit-line-clamp: 3;
            }

            .empresa-dados p {
                margin-top: 0.55mm;
                font-size: 2.05mm;
            }

            .empresa-grade {
                grid-template-columns: 17.5mm repeat(12, minmax(0, 1fr)) 10mm;
            }

            .grade-celula {
                border-width: 0.25mm;
                padding: 0.75mm 0.2mm;
                font-size: 2mm;
            }

            .grade-cabecalho {
                font-size: 1.85mm;
            }

            .linha-status {
                padding-left: 1.5mm;
                font-size: 2.05mm;
            }

            .valor-mes,
            .valor-total {
                font-size: 2.05mm;
            }

            .valor-total {
                font-size: 2.2mm;
            }

            .rodape-relatorio {
                grid-template-columns: 1fr auto auto;
                gap: 5mm;
                border-top-width: 0.25mm;
                padding-top: 1.4mm;
                font-size: 1.9mm;
            }
        }
    
        /* =======================================================
           CONTEXTO DA OBRA / EMPRESA CONTRATANTE
           ======================================================= */

        .resumo-anual--com-obra {
            grid-template-columns:
                minmax(330px, 2.25fr)
                repeat(3, minmax(120px, 1fr));
        }

        .resumo-card--obra {
            display: grid;
            min-width: 0;
            grid-template-columns: 42px minmax(0, 1fr);
            align-items: center;
            gap: 9px;
            overflow: hidden;
            padding: 6px 10px;
            border-color: #b9d2c5;
            background:
                linear-gradient(
                    110deg,
                    #f5fbf7 0%,
                    #eaf6ef 100%
                );
            color: #102b21;
        }

        .resumo-card--obra .resumo-obra-logo {
            width: 40px;
            height: 40px;
            margin: 0;
            border: 1px solid #d3e4da;
            border-radius: 8px;
            background: #ffffff;
            box-shadow:
                inset 0 0 0 2px #f5f8f6;
        }

        .resumo-card--obra
        .resumo-obra-logo
        .empresa-logo__imagem {
            width: 88%;
            height: 88%;
            object-fit: contain;
        }

        .resumo-card--obra
        .resumo-obra-logo
        .empresa-logo__iniciais {
            font-size: 13px;
        }

        .resumo-obra__texto {
            display: grid;
            min-width: 0;
            align-content: center;
            gap: 1px;
        }

        .resumo-obra__rotulo {
            display: block;
            overflow: hidden;
            color: #4b6659;
            font-size: 8px;
            font-weight: 800;
            line-height: 1.05;
            letter-spacing: 0.06em;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .resumo-obra__texto strong {
            display: block;
            overflow: hidden;
            color: #0b5f33;
            font-size: 11px;
            font-weight: 900;
            line-height: 1.08;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .resumo-obra__obra {
            display: block;
            overflow: hidden;
            color: #314c3e;
            font-size: 9px;
            font-weight: 700;
            line-height: 1.08;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        @media print {
            .resumo-anual--com-obra {
                grid-template-columns:
                    88mm
                    repeat(3, minmax(0, 1fr));
                gap: 2mm;
            }

            .resumo-card--obra {
                grid-template-columns:
                    8mm
                    minmax(0, 1fr);
                gap: 1.7mm;
                padding: 1mm 2mm;
            }

            .resumo-card--obra .resumo-obra-logo {
                width: 8mm;
                height: 8mm;
                border-width: 0.25mm;
                border-radius: 1.4mm;
                box-shadow:
                    inset 0 0 0 0.45mm #f5f8f6;
            }

            .resumo-card--obra
            .resumo-obra-logo
            .empresa-logo__iniciais {
                font-size: 2.5mm;
            }

            .resumo-obra__rotulo {
                font-size: 1.65mm;
            }

            .resumo-obra__texto strong {
                font-size: 2.2mm;
            }

            .resumo-obra__obra {
                font-size: 1.75mm;
            }
        }
        /* =======================================================
           PAGINAÇÃO DINÂMICA MULTIOBRA
           ======================================================= */

        .pagina-relatorio[data-modo="multiobra"] {
            grid-template-rows:
                88px
                minmax(0, 1fr)
                24px;
        }

        .pagina-conteudo-obras {
            display: grid;
            min-height: 0;
            align-content: start;
            gap: 9px;
            overflow: hidden;
        }

        .obra-bloco {
            display: grid;
            min-height: 0;
            gap: 5px;
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .obra-bloco .resumo-anual--com-obra {
            min-height: 58px;
        }

        .obra-bloco .empresas {
            display: grid;
            min-height: 0;
            grid-template-rows: none;
            grid-auto-rows: 72px;
            align-content: start;
            gap: 5px;
        }

        .obra-bloco .empresa-card {
            height: 72px;
            min-height: 72px;
        }

        @media print {
            .pagina-relatorio[data-modo="multiobra"] {
                grid-template-rows:
                    21mm
                    minmax(0, 1fr)
                    6mm;
            }

            .pagina-conteudo-obras {
                gap: 2.2mm;
            }

            .obra-bloco {
                gap: 1.2mm;
            }

            .obra-bloco .resumo-anual--com-obra {
                height: 12mm;
                min-height: 12mm;
            }

            .obra-bloco .empresas {
                grid-template-rows: none;
                grid-auto-rows: 20mm;
                align-content: start;
                gap: 1.2mm;
            }

            .obra-bloco .empresa-card {
                height: 20mm;
                min-height: 20mm;
            }
        }
    </style>
</head>
<body>
    <main class="relatorio">
        ${paginasHtml}
    </main>
</body>
</html>`;
}

export {
    distribuirEmpresasEmPaginas,
};
