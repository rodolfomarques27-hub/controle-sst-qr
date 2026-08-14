import {
    classificarCompetenciaVigenciaContratual,
} from "../domain/certidaoMensalVigenciaContratual.js";

const STATUS_RELATORIO = Object.freeze({
    confirmado: {
        rotulo: "Conforme",
        classe: "confirmado",
    },
    emAnalise: {
        rotulo: "Pendente",
        classe: "pendente",
    },
    pendente: {
        rotulo: "Pendente",
        classe: "pendente",
    },
    vencido: {
        rotulo: "Pendente",
        classe: "pendente",
    },
    reenvioSolicitado: {
        rotulo: "Pendente",
        classe: "pendente",
    },
});

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function obterIniciaisEmpresaRelatorio(nome) {
    const palavras =
        String(
            nome ||
            ""
        )
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (palavras.length === 0) {
        return "EM";
    }

    if (palavras.length === 1) {
        return palavras[0]
            .slice(0, 2)
            .toUpperCase();
    }

    return (
        palavras[0][0] +
        palavras[palavras.length - 1][0]
    ).toUpperCase();
}

function montarMarcaSafeScanMensal() {
    return `
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
    `;
}

function montarLogoEmpresaMensal(empresa) {
    const dados =
        empresa &&
        typeof empresa === "object"
            ? empresa
            : {};

    const nome =
        dados.nome ||
        dados.razaoSocial ||
        dados.razao_social ||
        "Empresa";

    const logoUrl =
        String(
            dados.logoUrl ||
            dados.logoURL ||
            dados.logo_url ||
            ""
        ).trim();

    if (logoUrl) {
        return `
            <div class="empresa-logo">
                <img
                    class="empresa-logo__imagem"
                    src="${escaparHtml(logoUrl)}"
                    alt="Logo ${escaparHtml(nome)}"
                >
            </div>
        `;
    }

    return `
        <div class="empresa-logo">
            <span class="empresa-logo__iniciais">
                ${escaparHtml(
                    obterIniciaisEmpresaRelatorio(
                        nome
                    )
                )}
            </span>
        </div>
    `;
}


function montarContratanteHeroMensal(
    contratante = null,
) {
    if (
        !contratante ||
        typeof contratante !== "object"
    ) {
        return `
            <div
                class="contratante-hero-mensal contratante-hero-mensal--vazia"
                aria-hidden="true"
            ></div>
        `;
    }

    const nome =
        String(
            contratante.nome ||
            contratante.razaoSocial ||
            contratante.razao_social ||
            "Contratante"
        ).trim();

    const logoUrl =
        String(
            contratante.logoUrl ||
            contratante.logoURL ||
            contratante.logo_url ||
            ""
        ).trim();

    if (logoUrl) {
        return `
            <div
                class="contratante-hero-mensal"
                title="Contratante: ${escaparHtml(nome)}"
            >
                <img
                    class="contratante-hero-mensal__imagem"
                    src="${escaparHtml(logoUrl)}"
                    alt="Logo ${escaparHtml(nome)}"
                >
            </div>
        `;
    }

    const iniciais =
        obterIniciaisEmpresaRelatorio(
            nome
        );

    return `
        <div
            class="contratante-hero-mensal"
            title="Contratante: ${escaparHtml(nome)}"
        >
            <span
                class="contratante-hero-mensal__iniciais"
            >
                ${escaparHtml(iniciais)}
            </span>
        </div>
    `;
}


function montarIconeResumoMensal(tipo) {
    if (tipo === "conforme") {
        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="#ffffff"
                    stroke-width="2"
                />

                <path
                    d="m8 12 2.6 2.7L16.5 9"
                    fill="none"
                    stroke="#ffffff"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        `;
    }

    if (tipo === "pendente") {
        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="#ffffff"
                    stroke-width="2"
                />

                <path
                    d="M12 7.5v6M12 17h.01"
                    fill="none"
                    stroke="#ffffff"
                    stroke-width="2.2"
                    stroke-linecap="round"
                />
            </svg>
        `;
    }

    return `
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="3"
                fill="none"
                stroke="#ffffff"
                stroke-width="2"
            />

            <path
                d="M8 9h8M8 13h8M8 17h5"
                fill="none"
                stroke="#ffffff"
                stroke-width="2"
                stroke-linecap="round"
            />
        </svg>
    `;
}

function normalizarStatus(valor) {
    const origem =
        typeof valor === "object" && valor !== null
            ? (
                valor.chave ||
                valor.id ||
                valor.status ||
                valor.classe ||
                valor.rotulo ||
                ""
            )
            : valor;

    const texto =
        String(origem || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "");

    if (texto.includes("venc")) {
        return "vencido";
    }

    if (texto.includes("reenvi")) {
        return "reenvioSolicitado";
    }

    if (
        texto.includes("confirm") ||
        texto.includes("conform")
    ) {
        return "confirmado";
    }

    if (texto.includes("analis")) {
        return "emAnalise";
    }

    return "pendente";
}

function montarDocumentos(documentos) {
    return (
        Array.isArray(documentos)
            ? documentos
            : []
    )
        .filter(
            (documento) =>
                documento?.exigido !== false &&
                String(
                    documento?.aplicabilidade ||
                    "APLICAVEL"
                )
                    .trim()
                    .toUpperCase() !==
                    "NAO_APLICAVEL"
        )
        .map(
        (documento, indice) => {
            const chaveStatus =
                normalizarStatus(
                    documento?.status
                );

            return {
                numero:
                    indice + 1,
                titulo:
                    documento?.titulo ||
                    "Documento sem título",
                subtitulo:
                    documento?.subtitulo ||
                    "",
                detalhePrincipal:
                    documento?.detalhePrincipal ||
                    "",
                detalheSecundario:
                    documento?.detalheSecundario ||
                    "",
                origemSistema:
                    Boolean(
                        documento?.origemSistema
                    ),
                chaveStatus,
                status:
                    STATUS_RELATORIO[chaveStatus] ||
                    STATUS_RELATORIO.pendente,
            };
        }
    );
}

function contarStatus(documentos, chave) {
    return documentos.filter(
        (documento) =>
            documento.chaveStatus === chave
    ).length;
}

function montarLinhaDocumento(documento) {
    const emissor =
        documento.subtitulo
            ? (
                '<span class="emissor">' +
                escaparHtml(documento.subtitulo) +
                "</span>"
            )
            : "";

    const origem =
        documento.origemSistema
            ? (
                '<span class="origem">' +
                "- Controle interno" +
                "</span>"
            )
            : "";

    const detalhes =
        [
            documento.detalhePrincipal,
            documento.detalheSecundario,
        ]
            .filter(Boolean)
            .map(escaparHtml)
            .join("<br>");

    return `
        <tr>
            <td class="numero">${documento.numero}</td>

            <td>
                <div class="documento-titulo">
                    <strong>
                        ${escaparHtml(documento.titulo)}
                    </strong>

                    ${origem}
                </div>

                ${emissor}
            </td>

            <td class="detalhes">
                ${detalhes || "Sem informação complementar"}
            </td>

            <td class="status-celula">
                <span class="status ${documento.status.classe}">
                    ${escaparHtml(documento.status.rotulo)}
                </span>
            </td>
        </tr>
    `;
}

function formatarDataHora() {
    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "short",
        }
    ).format(new Date());
}

const ROTULOS_STATUS_COMPETENCIA =
    Object.freeze({
        ABERTA:
            "Competência atual aberta",
        EM_CONFERENCIA:
            "Competência atual em conferência",
        FECHADA:
            "Competência atual fechada",
        REABERTA:
            "Competência atual reaberta",
    });

function obterRotuloStatusCompetencia(
    status,
) {
    const chave =
        String(status || "")
            .trim()
            .toUpperCase();

    return (
        ROTULOS_STATUS_COMPETENCIA[chave] ||
        "Competência atual em preparação"
    );
}

const MESES_HISTORICO_ANUAL = Object.freeze([
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
]);

function normalizarNumeroHistorico(
    valor,
) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const numero =
        Number(valor);

    if (!Number.isFinite(numero)) {
        return null;
    }

    return Math.max(
        0,
        Math.round(numero),
    );
}

function extrairCompetenciaHistorico(
    valor,
) {
    const texto =
        String(valor || "")
            .trim();

    const formatoBrasileiro =
        texto.match(
            /(?:^|[^\d])(0?[1-9]|1[0-2])\/(\d{4})(?:$|[^\d])/,
        );

    if (formatoBrasileiro) {
        return {
            mes:
                Number(formatoBrasileiro[1]),
            ano:
                Number(formatoBrasileiro[2]),
        };
    }

    const formatoIso =
        texto.match(
            /(?:^|[^\d])(\d{4})-(0?[1-9]|1[0-2])(?:$|[^\d-])/,
        );

    if (formatoIso) {
        return {
            mes:
                Number(formatoIso[2]),
            ano:
                Number(formatoIso[1]),
        };
    }

    return null;
}

function obterResumoHistorico(
    registro,
) {
    const resumo =
        registro?.resumo &&
        typeof registro.resumo === "object"
            ? registro.resumo
            : {};

    const totalExigiveis =
        normalizarNumeroHistorico(
            resumo.totalExigiveis ??
            resumo.total_exigiveis ??
            resumo.totalItens ??
            resumo.total_itens,
        );

    const conformes =
        normalizarNumeroHistorico(
            resumo.totalConfirmados ??
            resumo.total_confirmados ??
            resumo.totalConformes ??
            resumo.total_conformes,
        );

    const pendentes =
        totalExigiveis !== null &&
        conformes !== null
            ? Math.max(
                0,
                totalExigiveis - conformes,
            )
            : normalizarNumeroHistorico(
                resumo.totalPendentes ??
                resumo.total_pendentes ??
                resumo.pendentes,
            );

    return {
        total:
            totalExigiveis,
        conformes,
        pendentes,
    };
}

function montarCelulaHistorico({
    valor,
    classe,
    atual,
    futura,
}) {
    const semResultado =
        valor === null ||
        valor === undefined;

    const classes = [
        classe,
        atual
            ? "is-atual"
            : "",
        futura
            ? "is-futura"
            : "",
        semResultado
            ? "historico-sem-resultado"
            : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        '<td class="' + classes + '">' +
            (semResultado ? '—' : escaparHtml(valor)) +
        '</td>'
    );
}

export function montarHistoricoRelatorio({
    competencia,
    empresa,
    historicoAnual,
    resumoAtual,
}) {
    const competenciaSelecionada =
        extrairCompetenciaHistorico(
            competencia,
        );

    const ano =
        competenciaSelecionada?.ano ||
        Number(
            String(competencia || "")
                .slice(-4),
        ) ||
        new Date().getFullYear();

    const registrosPorMes =
        new Map();

    for (
        const registro of
        Array.isArray(historicoAnual)
            ? historicoAnual
            : []
    ) {
        const competenciaRegistro =
            extrairCompetenciaHistorico(
                registro?.competenciaLabel ||
                registro?.competencia ||
                registro?.competenciaIso ||
                registro?.competencia_iso,
            );

        if (
            !competenciaRegistro ||
            competenciaRegistro.ano !== ano
        ) {
            continue;
        }

        registrosPorMes.set(
            competenciaRegistro.mes,
            obterResumoHistorico(
                registro,
            ),
        );
    }

    if (
        competenciaSelecionada?.ano === ano &&
        resumoAtual
    ) {
        registrosPorMes.set(
            competenciaSelecionada.mes,
            {
                total:
                    normalizarNumeroHistorico(
                        resumoAtual.total,
                    ),
                conformes:
                    normalizarNumeroHistorico(
                        resumoAtual.conformes,
                    ),
                pendentes:
                    normalizarNumeroHistorico(
                        resumoAtual.pendentes,
                    ),
            },
        );
    }

    const totaisHistoricos =
        Array.from(
            registrosPorMes.values(),
        )
            .map(
                (registro) =>
                    normalizarNumeroHistorico(
                        registro?.total,
                    ),
            )
            .filter(
                (valor) =>
                    valor !== null &&
                    valor > 0,
            );

    const totalBaseHistorico =
        normalizarNumeroHistorico(
            resumoAtual?.total,
        ) ??
        totaisHistoricos[0] ??
        null;
    const cabecalhoMeses =
        MESES_HISTORICO_ANUAL
            .map(
                (mes, indice) => {
                    const numeroMes =
                        indice + 1;

                    const atual =
                        competenciaSelecionada?.ano === ano &&
                        competenciaSelecionada?.mes === numeroMes;

                    return (
                        '<th class="' + (atual ? 'is-atual' : '') + '">' +
                            mes +
                        '</th>'
                    );
                },
            )
            .join("");

    function montarLinhaHistorico(
        propriedade,
        rotulo,
        classe,
    ) {
        const celulas =
            MESES_HISTORICO_ANUAL
                .map(
                    (_, indice) => {
                        const numeroMes =
                            indice + 1;

                        const registro =
                            registrosPorMes.get(
                                numeroMes,
                            );

                        const competenciaMes =
                            ano +
                            "-" +
                            String(numeroMes)
                                .padStart(2, "0") +
                            "-01";

                        const vigenciaMes =
                            classificarCompetenciaVigenciaContratual({
                                empresa,
                                competencia:
                                    competenciaMes,
                            });

                        const exigivel =
                            vigenciaMes.exigivel;

                        const atual =
                            competenciaSelecionada?.ano === ano &&
                            competenciaSelecionada?.mes === numeroMes;

                        const futura =
                            competenciaSelecionada?.ano === ano &&
                            numeroMes >
                                competenciaSelecionada.mes;

                        let valor =
                            exigivel
                                ? (
                                    registro?.[propriedade] ??
                                    null
                                )
                                : null;

                        if (
                            exigivel &&
                            !registro &&
                            !futura &&
                            totalBaseHistorico !== null
                        ) {
                            if (
                                propriedade ===
                                "conformes"
                            ) {
                                valor = 0;
                            }

                            if (
                                propriedade ===
                                "pendentes"
                            ) {
                                valor =
                                    totalBaseHistorico;
                            }
                        }

                        return montarCelulaHistorico({
                            valor,
                            classe,
                            atual,
                            futura,
                        });
                    },
                )
                .join("");

        return (
            '<tr>' +
                '<th scope="row">' +
                    '<span class="historico-ponto ' + classe + '"></span>' +
                    rotulo +
                '</th>' +
                celulas +
            '</tr>'
        );
    }

    return (
        '<section class="historico-area">' +
            '<div class="historico-cabecalho">' +
                '<h2>Histórico anual — ' + escaparHtml(ano) + '</h2>' +
                '<div class="historico-legenda">' +
                    '<span><i class="historico-ponto conformes"></i>Conformes</span>' +
                    '<span><i class="historico-ponto pendentes"></i>Pendentes</span>' +
                '</div>' +
            '</div>' +
            '<div class="historico-tabela-container">' +
                '<table class="historico-tabela">' +
                    '<thead><tr><th>Resultado</th>' + cabecalhoMeses + '</tr></thead>' +
                    '<tbody>' +
                        montarLinhaHistorico("conformes", "Conformes", "conformes") +
                        montarLinhaHistorico("pendentes", "Pendentes", "pendentes") +
                    '</tbody>' +
                '</table>' +
            '</div>' +
            '<p class="historico-nota">Meses fora da vigência contratual e competências futuras são exibidos como —.</p>' +
        '</section>'
    );
}

export function imprimirRelatorioCertidaoMensal({
    competencia,
    empresa,
    contratante = null,
    obras = [],
    competenciaAtual,
    historicoAnual = [],
    documentos,
}) {
    if (!empresa) {
        throw new Error(
            "Selecione uma empresa antes de imprimir o relatório."
        );
    }

    const itens =
        montarDocumentos(documentos);

    if (itens.length === 0) {
        throw new Error(
            "Não há documentos disponíveis para o relatório."
        );
    }

    const total =
        itens.length;

    const conformes =
        contarStatus(
            itens,
            "confirmado"
        );

    const pendentes =
        Math.max(
            0,
            total - conformes
        );

    const conformidade =
        total > 0
            ? Math.round(
                (conformes / total) * 100
            )
            : 0;
    const janela =
        window.open(
            "",
            "_blank",
            "width=1250,height=900"
        );

    if (!janela) {
        throw new Error(
            "O navegador bloqueou a janela de impressão. " +
            "Libere os pop-ups para gerar o relatório."
        );
    }

    const empresaNome =
        empresa.nome ||
        empresa.razaoSocial ||
        "Empresa não informada";

    const empresaCnpj =
        empresa.cnpj ||
        "CNPJ não informado";

    const obrasRelatorioMensal =
        (
            Array.isArray(obras)
                ? obras
                : []
        )
            .filter(
                (obra) =>
                    obra &&
                    typeof obra === "object" &&
                    obra.semVinculo !== true &&
                    String(
                        obra.id ||
                        ""
                    ).trim() !==
                        "__sem_obra__"
            );

    const identificacoesObras =
        obrasRelatorioMensal
            .map(
                (obra) => {
                    const nomeObra =
                        String(
                            obra.nome ||
                            obra.nomeObra ||
                            obra.nome_obra ||
                            ""
                        ).trim();

                    const numeroObra =
                        String(
                            obra.numeroObra ||
                            obra.numero_obra ||
                            ""
                        ).trim();

                    if (!nomeObra) {
                        return "";
                    }

                    return numeroObra
                        ? (
                            nomeObra +
                            " • Nº " +
                            numeroObra
                        )
                        : nomeObra;
                }
            )
            .filter(Boolean);

    const identificacaoObras =
        identificacoesObras.join(
            " | "
        );

    const rotuloObras =
        identificacoesObras.length > 1
            ? "OBRAS"
            : "OBRA";

    const obraHtmlMensal =
        identificacaoObras
            ? [
                '<small class="empresa-obra-mensal">',
                escaparHtml(rotuloObras) + ":",
                escaparHtml(identificacaoObras),
                "</small>",
            ].join(
                " "
            )
            : "";
    const linhas =
        itens
            .map(montarLinhaDocumento)
            .join("");

    const historicoHtml =
        montarHistoricoRelatorio({
            competencia,
            empresa,
            historicoAnual,
            resumoAtual: {
                total,
                conformes,
                pendentes,
            },
        });
    const html = `
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">

    <title>
        Certidões Mensais -
        ${escaparHtml(empresaNome)}
    </title>

    <style>
        * {
            box-sizing: border-box;
        }

        @page {
            size: A4 portrait;
            margin: 8mm;
        }

        html,
        body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #203027;
            font-family: Arial, Helvetica, sans-serif;
        }

        body {
            padding: 16px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .pagina {
            width: 100%;
            max-width: 194mm;
            margin: 0 auto;
            overflow: hidden;
            border: 1px solid #dce5df;
            border-radius: 14px;
            background: #fff;
        }

        .cabecalho {
            padding: 18px 20px;
            background:
                linear-gradient(
                    135deg,
                    #07131f 0%,
                    #102a24 58%,
                    #168749 100%
                );
            color: #fff;
        }

        .marca {
            margin: 0 0 5px;
            color: #9df0b7;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.14em;
            text-transform: uppercase;
        }

        h1 {
            margin: 0;
            font-size: 22px;
        }

        .cabecalho p:last-child {
            margin: 7px 0 0;
            font-size: 11px;
            line-height: 1.4;
        }

        .identificacao {
            display: grid;
            grid-template-columns:
                minmax(0, 1fr)
                125px
                90px;
            gap: 10px;
            padding: 14px 18px;
            border-bottom: 1px solid #dce5df;
            background: #f8fbf9;
        }

        .campo,
        .indicador {
            border: 1px solid #dce5df;
            border-radius: 9px;
            background: #fff;
        }

        .campo {
            min-width: 0;
            padding: 9px 10px;
        }

        .identificacao .campo:last-child {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .campo span,
        .indicador span {
            display: block;
            color: #6d7d73;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
        }

        .campo strong {
            display: block;
            margin-top: 3px;
            overflow-wrap: anywhere;
            font-size: 11px;
        }

        .indicadores {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            padding: 14px 18px;
        }

        .indicador {
            padding: 9px 7px;
            text-align: center;
        }

        .indicador strong {
            display: block;
            margin-top: 3px;
            font-size: 18px;
        }

        .indicador.confirmado {
            border-color: #a9d9b8;
            background: #f0faf3;
        }

        .indicador.analise {
            border-color: #f4c97e;
            background: #fff8e9;
        }

        .indicador.pendente {
            border-color: #cbd3d8;
            background: #f3f5f6;
        }

        .indicador.vencido {
            border-color: #efadad;
            background: #fff1f1;
        }

        .tabela-area {
            padding: 0 18px 18px;
        }

        .tabela-area h2 {
            margin: 4px 0 9px;
            font-size: 13px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        th {
            border: 1px solid #dce5df;
            padding: 7px 6px;
            background: #edf4ef;
            color: #405247;
            font-size: 8px;
            text-align: left;
            text-transform: uppercase;
        }

        td {
            border: 1px solid #dce5df;
            padding: 7px 6px;
            vertical-align: top;
            font-size: 9px;
            line-height: 1.4;
        }

        td.numero {
            text-align: center;
            font-weight: 900;
        }

        td.detalhes {
            color: #526259;
        }

        td strong {
            display: block;
            font-size: 9.5px;
        }

        .documento-titulo {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 4px;
            overflow: hidden;
            white-space: nowrap;
        }

        .documento-titulo strong {
            display: inline;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .emissor {
            display: block;
            margin-top: 2px;
            color: #66776d;
            font-size: 8px;
        }

        .origem {
            display: inline;
            flex: 0 0 auto;
            margin: 0;
            color: #168749;
            font-size: 7px;
            font-weight: 800;
            white-space: nowrap;
        }

        th:last-child,
        td.status-celula {
            text-align: center;
        }

        td.status-celula {
            vertical-align: middle;
        }

        td.status-celula .status {
            margin-right: auto;
            margin-left: auto;
        }

        .status {
            display: inline-flex;
            min-width: 72px;
            justify-content: center;
            border: 1px solid transparent;
            border-radius: 999px;
            padding: 3px 6px;
            font-size: 7.5px;
            font-weight: 900;
            white-space: nowrap;
        }

        .status.confirmado {
            border-color: #9fd4af;
            background: #eaf8ef;
            color: #13773e;
        }

        .status.analise {
            border-color: #f1bf68;
            background: #fff4dd;
            color: #a45b00;
        }

        .status.pendente {
            border-color: #c7ced3;
            background: #eef1f3;
            color: #5e6870;
        }

        .status.vencido {
            border-color: #e58c8c;
            background: #fde8e8;
            color: #b62828;
        }        .historico-area {
            margin: 0 18px 14px;
            overflow: hidden;
            border: 1px solid #dce5df;
            border-radius: 10px;
            background: #fff;
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .historico-cabecalho {
            display: flex;
            min-height: 34px;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            border-bottom: 1px solid #dce5df;
            padding: 7px 10px;
            background: #f8fbf9;
        }

        .historico-cabecalho h2 {
            margin: 0;
            color: #203027;
            font-size: 10px;
            line-height: 1.2;
        }

        .historico-legenda {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            color: #5f7066;
            font-size: 6.5px;
            font-weight: 800;
            white-space: nowrap;
        }

        .historico-legenda span {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .historico-ponto {
            display: inline-block;
            width: 6px;
            height: 6px;
            flex: 0 0 6px;
            border-radius: 999px;
        }

        .historico-ponto.conformes {
            background: #168749;
        }

        .historico-ponto.pendentes {
            background: #cf3030;
        }

        .historico-tabela-container {
            width: 100%;
            overflow: hidden;
        }

        .historico-tabela {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
        }

        .historico-tabela th,
        .historico-tabela td {
            height: 25px;
            border: 0;
            border-right: 1px solid #e4ebe7;
            border-bottom: 1px solid #e4ebe7;
            padding: 4px 2px;
            text-align: center;
            vertical-align: middle;
            font-size: 7px;
            line-height: 1;
        }

        .historico-tabela thead th {
            background: #f3f7f5;
            color: #56675d;
            font-size: 6.5px;
            font-weight: 900;
            text-transform: uppercase;
        }

        .historico-tabela th:first-child {
            width: 70px;
            padding-left: 8px;
            text-align: left;
        }

        .historico-tabela tbody th {
            background: #fbfcfb;
            color: #314239;
            font-weight: 900;
            white-space: nowrap;
        }

        .historico-tabela tbody th .historico-ponto {
            margin-right: 4px;
            vertical-align: middle;
        }

        .historico-tabela th:last-child,
        .historico-tabela td:last-child {
            border-right: 0;
        }

        .historico-tabela tbody tr:last-child th,
        .historico-tabela tbody tr:last-child td {
            border-bottom: 0;
        }

        .historico-tabela td.conformes {
            background: #eef9f1;
            color: #13773e;
            font-weight: 900;
        }

        .historico-tabela td.pendentes {
            background: #fff1f1;
            color: #bb2929;
            font-weight: 900;
        }

        .historico-tabela .is-atual {
            box-shadow:
                inset 1px 0 0 #84c99a,
                inset -1px 0 0 #84c99a;
        }

        .historico-tabela thead .is-atual {
            background: #e4f5e9;
            color: #126b39;
        }

        .historico-tabela td.is-futura,
        .historico-tabela td.historico-sem-resultado {
            background: #fafbfa;
            color: #a0aaa4;
            font-weight: 700;
        }

        .historico-nota {
            margin: 0;
            border-top: 1px solid #e4ebe7;
            padding: 5px 10px;
            background: #fbfcfb;
            color: #748178;
            font-size: 6.5px;
            font-weight: 700;
            line-height: 1.25;
        }


        .rodape {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            border-top: 1px solid #dce5df;
            padding: 10px 18px;
            background: #f8fbf9;
            color: #68786e;
            font-size: 8px;
            font-weight: 700;
        }

        tr,
        .campo,
        .indicador {
            break-inside: avoid;
            page-break-inside: avoid;
        }


        /* ==================================================
           SAFESCAN J.49
           PADRAO VISUAL PDF MENSAL X ANUAL
           ================================================== */

        .cabecalho {
            display: grid;
            min-height: 78px;
            grid-template-columns:
                minmax(155px, 0.72fr)
                minmax(0, 2.28fr);
            align-items: center;
            gap: 18px;
            overflow: hidden;
            border-radius: 11px;
            margin: 0 14px;
            padding: 0 18px;
            color: #ffffff;
            background-color: #063e32;
            background-image:
                linear-gradient(
                    108deg,
                    rgba(4, 25, 34, 0.84) 0%,
                    rgba(5, 61, 49, 0.72) 48%,
                    rgba(7, 131, 62, 0.56) 100%
                ),
                url("data:image/webp;base64,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");
            background-repeat:
                no-repeat,
                no-repeat;
            background-position:
                center,
                88% 50%;
            background-size:
                cover,
                auto 185%;
        }

        .marca-safescan {
            display: flex;
            height: 100%;
            align-items: center;
            justify-content: flex-start;
            gap: 9px;
        }

        .marca-safescan__simbolo {
            width: 39px;
            height: 39px;
            flex: 0 0 39px;
        }

        .marca-safescan__texto {
            display: grid;
            color: #ffffff;
            line-height: 1;
        }

        .marca-safescan__texto strong {
            font-size: 17px;
            font-weight: 900;
            letter-spacing: 0.025em;
        }

        .marca-safescan__texto small {
            margin-top: 4px;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.18em;
        }

        .titulo-relatorio-mensal {
            display: flex;
            min-width: 0;
            height: 100%;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .titulo-relatorio-mensal h1 {
            margin: 0;
            color: #ffffff;
            font-size: 21px;
            line-height: 1.08;
            letter-spacing: -0.025em;
            white-space: nowrap;
        }

        .titulo-relatorio-mensal p {
            margin: 5px 0 0;
            color: rgba(255, 255, 255, 0.90);
            font-size: 9px;
            font-weight: 700;
            line-height: 1.2;
        }

        .identificacao {
            display: grid;
            grid-template-columns:
                minmax(0, 1fr)
                100px;
            gap: 9px;
            padding: 10px 14px 6px;
            border-bottom: 0;
            background: #ffffff;
        }

        .empresa-identidade-mensal {
            display: grid;
            min-width: 0;
            grid-template-columns:
                48px
                minmax(0, 1fr);
            align-items: center;
            gap: 9px;
            min-height: 64px;
            overflow: hidden;
            border: 1px solid #cddbd3;
            border-left: 3px solid #0b8a45;
            border-radius: 9px;
            padding: 5px 9px;
            background:
                linear-gradient(
                    90deg,
                    #ffffff,
                    #fbfdfc
                );
        }

        .empresa-logo {
            display: grid;
            width: 43px;
            height: 43px;
            place-items: center;
            overflow: hidden;
            border: 1px solid #cbd9d1;
            border-radius: 8px;
            background: #ffffff;
            box-shadow:
                inset 0 0 0 2px #f6f9f7;
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
            background:
                linear-gradient(
                    135deg,
                    #08763a,
                    #13a14a
                );
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 0.04em;
        }

        .empresa-dados-mensal {
            min-width: 0;
        }

        .empresa-dados-mensal > span {
            display: block;
            margin-bottom: 2px;
            color: #6b7c72;
            font-size: 7px;
            font-weight: 900;
            letter-spacing: 0.07em;
            text-transform: uppercase;
        }

        .empresa-dados-mensal > strong {
            display: block;
            overflow: hidden;
            color: #102b21;
            font-size: 11px;
            font-weight: 900;
            line-height: 1.16;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .empresa-dados-mensal > small {
            display: block;
            margin-top: 3px;
            overflow: hidden;
            color: #617268;
            font-size: 8px;
            font-weight: 700;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .empresa-dados-mensal > .empresa-obra-mensal {
            display: block;
            margin-top: 2px;
            overflow: visible;
            color: #315345;
            font-size: 7px;
            font-weight: 800;
            line-height: 1.12;
            text-overflow: clip;
            white-space: normal;
        }
        .campo.competencia-mensal {
            display: flex;
            min-width: 0;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid #cddbd3;
            border-radius: 9px;
            padding: 7px;
            background: #ffffff;
            text-align: center;
        }

        .campo.competencia-mensal span {
            font-size: 7px;
            letter-spacing: 0.05em;
        }

        .campo.competencia-mensal strong {
            margin-top: 4px;
            color: #073d31;
            font-size: 12px;
            font-weight: 900;
        }

        .indicadores {
            display: grid;
            grid-template-columns:
                repeat(
                    3,
                    minmax(0, 1fr)
                );
            gap: 8px;
            padding: 4px 14px 10px;
        }

        .indicador {
            display: grid;
            min-height: 43px;
            grid-template-columns:
                minmax(0, 1fr)
                auto
                minmax(0, 1fr);
            align-items: center;
            column-gap: 0;
            overflow: hidden;
            border-radius: 8px;
            padding: 6px 9px;
            color: #ffffff;
            text-align: center;
        }

        .indicador.total {
            border-color: #063e32;
            background:
                linear-gradient(
                    110deg,
                    #06382f,
                    #075747
                );
        }

        .indicador.confirmado {
            border-color: #0d8a42;
            background:
                linear-gradient(
                    110deg,
                    #087c36,
                    #18a34b
                );
        }

        .indicador.pendente {
            border-color: #db1823;
            background:
                linear-gradient(
                    110deg,
                    #d90f1c,
                    #f2222c
                );
        }

        .indicador__icone {
            display: grid;
            width: 23px;
            height: 23px;
            grid-column: 1;
            grid-row: 1;
            place-items: center;
            justify-self: start;
        }

        .indicador__icone svg {
            width: 20px;
            height: 20px;
        }

        .indicador__texto {
            display: flex;
            width: max-content;
            max-width: 100%;
            grid-column: 2;
            grid-row: 1;
            align-items: baseline;
            justify-content: center;
            justify-self: center;
            gap: 5px;
            white-space: nowrap;
        }

        .indicador__texto span {
            display: inline;
            color: #ffffff;
            font-size: 8px;
            font-weight: 800;
            letter-spacing: 0;
            text-transform: none;
        }

        .indicador__texto strong {
            display: inline;
            margin: 0;
            color: #ffffff;
            font-size: 16px;
            font-weight: 900;
        }

        .tabela-area {
            padding:
                0
                14px
                12px;
        }

        .tabela-area h2 {
            margin:
                2px
                0
                7px;
            color: #19372c;
            font-size: 11px;
        }


        /* ==================================================
           SAFESCAN J.49-P2
           ACABAMENTO VISUAL DO PDF MENSAL
           ================================================== */

        /*
         * HERO
         * Dá respiro superior e melhora o eixo vertical,
         * sem alterar a identidade criada na J.49-P1.
         */
        .cabecalho {
            min-height: 84px;
            margin:
                8px
                14px
                0;
            padding:
                0
                20px;
            align-items: center;
        }

        .marca-safescan {
            align-items: center;
        }

        .titulo-relatorio-mensal {
            align-items: center;
            justify-content: center;
            text-align: center;
        }

        .titulo-relatorio-mensal h1 {
            font-size: 22px;
        }

        .titulo-relatorio-mensal p {
            margin-top: 6px;
            font-size: 9.5px;
        }

        /*
         * IDENTIFICAÇÃO
         */
        .identificacao {
            padding:
                10px
                14px
                7px;
        }

        /*
         * INDICADORES
         * Número e legenda passam a ter peso visual semelhante.
         */
        .indicadores {
            gap: 9px;
            padding:
                5px
                14px
                11px;
        }

        .indicador {
            min-height: 49px;
            border-radius: 9px;
            padding:
                7px
                10px;
        }

        .indicador__icone {
            width: 25px;
            height: 25px;
        }

        .indicador__icone svg {
            width: 22px;
            height: 22px;
        }

        .indicador__texto {
            gap: 6px;
        }

        .indicador__texto span {
            font-size: 9.5px;
            font-weight: 900;
        }

        .indicador__texto strong {
            font-size: 20px;
            font-weight: 950;
            line-height: 1;
        }

        /*
         * DOCUMENTOS DA COMPETÊNCIA
         * Cabeçalho centralizado, tabela mais limpa
         * e composição mais próxima do relatório anual.
         */
        .tabela-area {
            padding:
                0
                14px
                12px;
        }

        .tabela-area h2 {
            display: flex;
            min-height: 30px;
            margin: 0;
            align-items: center;
            justify-content: center;
            border:
                1px solid
                #cedbd4;
            border-bottom: 0;
            border-radius:
                9px
                9px
                0
                0;
            padding:
                7px
                12px;
            color: #123c2d;
            background:
                linear-gradient(
                    180deg,
                    #f8fcf9,
                    #edf6f1
                );
            font-size: 11.5px;
            font-weight: 900;
            line-height: 1.2;
            text-align: center;
        }

        .tabela-area > table {
            overflow: hidden;
            border:
                1px solid
                #cedbd4;
            border-radius:
                0
                0
                9px
                9px;
            background: #ffffff;
            box-shadow:
                0
                4px
                14px
                rgba(
                    8,
                    60,
                    43,
                    0.06
                );
        }

        .tabela-area thead th {
            padding:
                7px
                6px;
            color: #244438;
            background:
                #eef5f1;
            font-size: 7.5px;
            font-weight: 950;
            letter-spacing: 0.075em;
            line-height: 1.2;
            text-align: center;
            vertical-align: middle;
        }

        .tabela-area tbody td {
            padding:
                6px
                7px;
            line-height: 1.25;
            text-align: center;
            vertical-align: middle;
        }

        .tabela-area tbody tr:nth-child(even) {
            background: #fbfdfc;
        }

        .tabela-area tbody td:first-child {
            color: #173a2d;
            font-weight: 950;
        }

        .tabela-area tbody td:nth-child(2),
        .tabela-area tbody td:nth-child(3),
        .tabela-area tbody td:nth-child(4) {
            text-align: center;
        }

        .tabela-area tbody td strong,
        .tabela-area tbody td span,
        .tabela-area tbody td small {
            text-align: center;
        }


        /* ==================================================
           SAFESCAN J.49-P2-R1
           AJUSTE DOCUMENTOS + INDICADORES
           ================================================== */

        /*
         * INDICADORES
         * Os rótulos deixam de parecer pequenos ao lado
         * dos valores numéricos.
         */
        /*
         * SAFESCAN J.49-P3-R1
         * Composicao final dos indicadores:
         * rotulo e valor em dois niveis,
         * centralizados no mesmo eixo visual.
         */
        .indicador {
            min-height: 58px;
        }

        .indicador__texto {
            display: grid;
            width: max-content;
            max-width: 100%;
            grid-template-rows:
                auto
                auto;
            align-items: center;
            justify-items: center;
            justify-content: center;
            justify-self: center;
            gap: 4px;
            white-space: nowrap;
        }

        .indicador__texto span {
            display: block;
            margin: 0;
            color: #ffffff;
            font-size: 12.5px;
            font-weight: 900;
            line-height: 1;
            letter-spacing: 0.01em;
            text-align: center;
        }

        .indicador__texto strong {
            display: block;
            margin: 0;
            color: #ffffff;
            font-size: 21px;
            font-weight: 950;
            line-height: 1;
            text-align: center;
        }

        /*
         * COLUNA Nº
         * Continua centralizada.
         */
        .tabela-area tbody td:first-child {
            text-align: center;
            vertical-align: middle;
        }

        /*
         * COLUNA DOCUMENTO
         *
         * Não centralizar.
         * O conteúdo deve começar imediatamente à direita
         * da numeração, no padrão tradicional de relatório.
         */
        .tabela-area tbody td:nth-child(2) {
            padding-left: 10px;
            padding-right: 8px;
            text-align: left;
            vertical-align: middle;
        }

        .tabela-area tbody td:nth-child(2) strong,
        .tabela-area tbody td:nth-child(2) span,
        .tabela-area tbody td:nth-child(2) small,
        .tabela-area tbody td:nth-child(2) .emissor {
            text-align: left;
        }

        .tabela-area tbody td:nth-child(2) strong {
            display: block;
            font-size: 9px;
            font-weight: 900;
            line-height: 1.22;
        }

        .tabela-area tbody td:nth-child(2) .emissor,
        .tabela-area tbody td:nth-child(2) small {
            display: block;
            margin-top: 3px;
            font-size: 7px;
            line-height: 1.2;
        }

        /*
         * SITUAÇÃO E STATUS
         * Permanecem centralizados.
         */
        .tabela-area tbody td:nth-child(3),
        .tabela-area tbody td:nth-child(4) {
            text-align: center;
            vertical-align: middle;
        }


        /* ==================================================
           SAFESCAN J.49-P4-R1
           CONTRATANTE DINAMICA NO HERO MENSAL
           ================================================== */

        .cabecalho {
            grid-template-columns:
                minmax(145px, 1fr)
                minmax(0, 1.9fr)
                minmax(145px, 1fr);
            column-gap: 12px;
        }

        .marca-safescan {
            grid-column: 1;
            justify-self: start;
        }

        .titulo-relatorio-mensal {
            width: 100%;
            grid-column: 2;
            justify-self: center;
        }

        .contratante-hero-mensal {
            display: flex;
            width: 48px;
            height: 48px;
            box-sizing: border-box;
            grid-column: 3;
            align-items: center;
            justify-content: center;
            justify-self: end;
            overflow: hidden;
            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    0.32
                );
            border-radius: 5px;
            padding:
                2px;
            background:
                rgba(
                    255,
                    255,
                    255,
                    0.98
                );
            box-shadow:
                0
                2px
                6px
                rgba(
                    0,
                    0,
                    0,
                    0.08
                );
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .contratante-hero-mensal__imagem {
            display: block;
            width: auto;
            max-width: 42px;
            height: auto;
            max-height: 42px;
            object-fit: contain;
        }

        .contratante-hero-mensal__iniciais {
            display: grid;
            width: 38px;
            height: 38px;
            place-items: center;
            border-radius: 50%;
            color: #0b6b43;
            background: #e9f6ef;
            font-size: 14px;
            font-weight: 950;
        }

        .contratante-hero-mensal--vazia {
            border-color: transparent;
            background: transparent;
            box-shadow: none;
        }

        /* AJUSTE SAFESCAN — DISTRIBUIÇÃO A4 */
        .pagina {
            min-height: 278mm;
            display: flex;
            flex-direction: column;
        }

        .tabela-area {
            display: flex;
            flex: 1 1 auto;
            flex-direction: column;
        }

        .tabela-area > table {
            height: 100%;
            flex: 1 1 auto;
        }

        .historico-tabela th,
        .historico-tabela td {
            height: 30px;
        }

        .rodape {
            margin-top: auto;
        }
        /* ==================================================
           D24.13.3 — tabela documental unificada
           Título, cabeçalho e corpo formam uma única grade.
           ================================================== */

        .tabela-area {
            padding:
                0
                14px
                12px;
        }

        .tabela-area > table {
            width: 100%;
            overflow: hidden;
            border:
                1.35px solid
                #9eafa5;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 9px;
            background: #ffffff;
            box-shadow:
                0
                4px
                14px
                rgba(
                    8,
                    60,
                    43,
                    0.06
                );
        }

        .tabela-area thead .tabela-titulo-row th {
            min-height: 32px;
            padding:
                8px
                12px;
            border: 0;
            border-bottom:
                1.35px solid
                #9eafa5;
            color: #123c2d;
            background:
                linear-gradient(
                    180deg,
                    #f7fbf8,
                    #e9f2ed
                );
            font-size: 11.5px;
            font-weight: 950;
            letter-spacing: 0;
            line-height: 1.2;
            text-align: center;
            text-transform: none;
            vertical-align: middle;
        }

        .tabela-area thead .tabela-colunas-row th {
            padding:
                7px
                6px;
            border: 0;
            border-right:
                1px solid
                #acbbb2;
            border-bottom:
                1.2px solid
                #9eafa5;
            color: #244438;
            background: #e4ede8;
            font-size: 7.7px;
            font-weight: 950;
            letter-spacing: 0.065em;
            line-height: 1.2;
            text-align: center;
            vertical-align: middle;
        }

        .tabela-area thead .tabela-colunas-row th:last-child {
            border-right: 0;
        }

        .tabela-area tbody td {
            border: 0;
            border-right:
                1px solid
                #b6c3bb;
            border-bottom:
                1px solid
                #b6c3bb;
        }

        .tabela-area tbody td:last-child {
            border-right: 0;
        }

        .tabela-area tbody tr:last-child td {
            border-bottom: 0;
        }

        .tabela-area tbody tr:nth-child(even) {
            background: #f9fbfa;
        }

        .tabela-area tbody tr:nth-child(odd) {
            background: #ffffff;
        }
        @media print {
            body {
                padding: 0;
            }

            .pagina {
                max-width: none;
                border: 0;
                border-radius: 0;
            }

            .tabela-area > table {
                border:
                    1.4px solid
                    #788980 !important;
                box-shadow: none !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .tabela-area thead .tabela-titulo-row th {
                border-bottom:
                    1.4px solid
                    #788980 !important;
                background: #e7efea !important;
                color: #123c2d !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .tabela-area thead .tabela-colunas-row th {
                border-right:
                    1px solid
                    #87988e !important;
                border-bottom:
                    1.25px solid
                    #788980 !important;
                background: #dce7e0 !important;
                color: #203a30 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .tabela-area thead .tabela-colunas-row th:last-child {
                border-right: 0 !important;
            }

            .tabela-area tbody td {
                border-right:
                    1px solid
                    #98a89e !important;
                border-bottom:
                    1px solid
                    #98a89e !important;
            }

            .tabela-area tbody td:last-child {
                border-right: 0 !important;
            }

            .tabela-area tbody tr:last-child td {
                border-bottom: 0 !important;
            }

            .tabela-area tbody tr:nth-child(even) {
                background: #f7f9f8 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>

<body>
    <main class="pagina">
        <header class="cabecalho">
            ${montarMarcaSafeScanMensal()}

            <div class="titulo-relatorio-mensal">
                <h1>Certidões Mensais</h1>

                <p>
                    Visão mensal por empresa
                </p>
            </div>

            ${montarContratanteHeroMensal(contratante)}
        </header>

        <section class="identificacao">
            <div class="empresa-identidade-mensal">
                ${montarLogoEmpresaMensal(empresa)}

                <div class="empresa-dados-mensal">
                    <span>Empresa</span>

                    <strong>
                        ${escaparHtml(empresaNome)}
                    </strong>

                    <small>
                        CNPJ ${escaparHtml(empresaCnpj)}
                    </small>
                    ${obraHtmlMensal}
                </div>
            </div>

            <div class="campo competencia-mensal">
                <span>Competência</span>

                <strong>
                    ${escaparHtml(competencia)}
                </strong>
            </div>
        </section>

        <section class="indicadores">
            <div class="indicador total">
                <span class="indicador__icone">
                    ${montarIconeResumoMensal("total")}
                </span>

                <span class="indicador__texto">
                    <span>Total</span>
                    <strong>${total}</strong>
                </span>
            </div>

            <div class="indicador confirmado">
                <span class="indicador__icone">
                    ${montarIconeResumoMensal("conforme")}
                </span>

                <span class="indicador__texto">
                    <span>Conformes</span>
                    <strong>${conformes}</strong>
                </span>
            </div>

            <div class="indicador pendente">
                <span class="indicador__icone">
                    ${montarIconeResumoMensal("pendente")}
                </span>

                <span class="indicador__texto">
                    <span>Pendentes</span>
                    <strong>${pendentes}</strong>
                </span>
            </div>
        </section>

        <section class="tabela-area">
            <table>
                <colgroup>
                    <col style="width: 5%">
                    <col style="width: 34%">
                    <col style="width: 41%">
                    <col style="width: 20%">
                </colgroup>

                <thead>
                    <tr class="tabela-titulo-row">
                        <th colspan="4">
                            Documentos da competência —
                            conformidade ${conformidade}%
                        </th>
                    </tr>

                    <tr class="tabela-colunas-row">
                        <th>Nº</th>
                        <th>Documento</th>
                        <th>Situação atual</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    ${linhas}
                </tbody>
            </table>
        </section>

        ${historicoHtml}

        <footer class="rodape">
            <span>Gerado pelo SafeScan Brasil</span>
            <span>${escaparHtml(formatarDataHora())}</span>
        </footer>
    </main>
</body>
</html>
    `;

    janela.document.open();
    janela.document.write(html);
    janela.document.close();

    janela.setTimeout(
        () => {
            janela.focus();
            janela.print();
        },
        500
    );

    return true;
}
