import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    carregarDadosRelatorioAnualCertidaoMensal,
    consolidarRelatorioAnualCertidaoMensal,
    contarFuncionariosAtivosEmpresa,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalRelatorioAnualDataService.js";
import {
    distribuirEmpresasEmPaginas,
    gerarHtmlRelatorioAnualCertidaoMensal,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalRelatorioAnualHtmlService.js";

const diretorioAtual = path.dirname(fileURLToPath(import.meta.url));
const raizProjeto = path.resolve(diretorioAtual, "..");

const EMPRESA_A = "11111111-1111-4111-8111-111111111111";
const EMPRESA_B = "22222222-2222-4222-8222-222222222222";
const EMPRESA_CONTRATANTE = "33333333-3333-4333-8333-333333333333";
const COMPETENCIA_A_JAN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMPETENCIA_A_FEV = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const empresas = [
    {
        id: EMPRESA_A,
        nome: "Ciranda Ecológica <Teste>",
        cnpj: "36.288.944/0001-53",
        logoUrl: "https://exemplo.invalid/logo-a.png",
        tipoEmpresa: "Terceirizada",
        dataInicioContrato: "2026-01-15",
        dataFimContrato: "",
    },
    {
        id: EMPRESA_B,
        nome: "Verde Mais Serviços Ambientais Ltda.",
        cnpj: "19.705.321/0001-69",
        tipoEmpresa: "Subcontratada",
        dataInicioContrato: "2026-03-01",
        dataFimContrato: "2026-06-30",
    },
    {
        id: EMPRESA_CONTRATANTE,
        nome: "Idealiza Contratante",
        cnpj: "00.000.000/0001-00",
        tipoEmpresa: "Contratante",
        dataInicioContrato: "2026-01-01",
    },
];

const colaboradores = [
    {
        id: "c1",
        empresaId: EMPRESA_A,
        statusMobilizacao: "Liberado",
    },
    {
        id: "c2",
        empresa_id: EMPRESA_A,
        status_mobilizacao: "Com pendência",
    },
    {
        id: "c3",
        empresaId: EMPRESA_A,
        statusMobilizacao: "Desmobilizado",
    },
    {
        id: "c4",
        empresaId: EMPRESA_A,
        statusMobilizacao: "Inativo",
    },
    {
        id: "c5",
        empresaId: EMPRESA_B,
        statusMobilizacao: "Liberado",
    },
];

const competencias = [
    {
        id: COMPETENCIA_A_JAN,
        empresa_id: EMPRESA_A,
        competencia: "2026-01-01",
        status: "EM_CONFERENCIA",
        resumo: {},
    },
    {
        id: COMPETENCIA_A_FEV,
        empresa_id: EMPRESA_A,
        competencia: "2026-02-01",
        status: "FECHADA",
        resumo: {
            totalExigiveis: 10,
            totalConfirmados: 10,
        },
    },
];

const itens = [
    {
        competencia_id: COMPETENCIA_A_JAN,
        tipo_documento: "cnd-federal",
        origem: "UPLOAD",
        status: "CONFORME",
    },
    {
        competencia_id: COMPETENCIA_A_JAN,
        tipo_documento: "crf-fgts",
        origem: "UPLOAD",
        status: "CONFORME",
    },
    {
        competencia_id: COMPETENCIA_A_JAN,
        tipo_documento: "fgts",
        origem: "UPLOAD",
        status: "EM_ANALISE",
    },
    {
        competencia_id: COMPETENCIA_A_JAN,
        tipo_documento: "cndt-trabalhista",
        origem: "UPLOAD",
        status: "DISPENSADO",
    },
    {
        competencia_id: COMPETENCIA_A_JAN,
        tipo_documento: "relacao-empregados",
        origem: "SISTEMA",
        status: "PENDENTE",
    },
    {
        competencia_id: COMPETENCIA_A_JAN,
        tipo_documento: "aso-pcmso",
        origem: "SISTEMA",
        status: "PENDENTE",
    },
    ...[
        "cnd-federal",
        "crf-fgts",
        "fgts",
        "cndt-trabalhista",
        "cnd-estadual",
        "cnd-municipal",
        "falencia-concordata",
        "cadastro-tce-ceis",
    ].map((tipoDocumento) => ({
        competencia_id: COMPETENCIA_A_FEV,
        tipo_documento: tipoDocumento,
        origem: "UPLOAD",
        status: "CONFORME",
    })),
];

assert.equal(
    contarFuncionariosAtivosEmpresa({
        empresa: empresas[0],
        colaboradores,
    }),
    2,
    "A contagem deve excluir colaboradores desmobilizados e inativos.",
);

const relatorio = consolidarRelatorioAnualCertidaoMensal({
    ano: 2026,
    empresas,
    colaboradores,
    competencias,
    itens,
    agora: new Date("2026-08-06T12:00:00-03:00"),
    totalDocumentosPadrao: 15,
});

assert.equal(relatorio.ano, 2026);
assert.equal(
    relatorio.empresas.length,
    2,
    "A empresa contratante não pode entrar no relatório fiscalizável.",
);

const ciranda = relatorio.empresas.find(
    (empresa) => empresa.id === EMPRESA_A,
);
const verdeMais = relatorio.empresas.find(
    (empresa) => empresa.id === EMPRESA_B,
);

assert.ok(ciranda, "A Ciranda deve constar no relatório.");
assert.ok(verdeMais, "A Verde Mais deve constar no relatório.");
assert.equal(ciranda.funcionarios, 2);
assert.deepEqual(
    {
        conformes: ciranda.meses[0].conformes,
        pendentes: ciranda.meses[0].pendentes,
    },
    {
        conformes: 2,
        pendentes: 1,
    },
    "O mês com itens reais deve consolidar somente Conforme e Pendente.",
);
assert.deepEqual(
    {
        conformes: ciranda.meses[1].conformes,
        pendentes: ciranda.meses[1].pendentes,
    },
    {
        conformes: 10,
        pendentes: 0,
    },
    "O mês fechado deve preservar os dez documentos exigíveis registrados no snapshot histórico.",
);
assert.deepEqual(
    {
        conformes: ciranda.meses[2].conformes,
        pendentes: ciranda.meses[2].pendentes,
    },
    {
        conformes: 0,
        pendentes: 15,
    },
    "Mês exigível sem competência deve considerar quinze documentos externos.",
);
assert.equal(
    ciranda.meses[8].conformes,
    null,
    "Competência futura deve ser exibida como traço.",
);
assert.equal(
    verdeMais.meses[0].conformes,
    null,
    "Mês anterior ao início contratual deve ficar fora da contagem.",
);
assert.equal(
    verdeMais.meses[2].pendentes,
    15,
    "Primeiro mês da vigência sem resultado deve ser pendente.",
);
assert.equal(
    verdeMais.meses[6].pendentes,
    null,
    "Mês posterior ao fim do contrato deve ficar fora da contagem.",
);
assert.equal(
    relatorio.totais.percentualConforme +
        relatorio.totais.percentualPendente,
    100,
    "Os percentuais binários devem totalizar 100%." ,
);

function criarConsultaSupabaseMock(dados) {
    const consulta = {
        select() {
            return consulta;
        },
        in() {
            return consulta;
        },
        gte() {
            return consulta;
        },
        lt() {
            return consulta;
        },
        order() {
            return consulta;
        },
        then(resolver, rejeitar) {
            return Promise.resolve({
                data: dados,
                error: null,
            }).then(resolver, rejeitar);
        },
    };

    return consulta;
}

const tabelasConsultadas = [];
const clienteSupabaseMock = {
    from(tabela) {
        tabelasConsultadas.push(tabela);

        if (tabela === "certidao_mensal_competencias") {
            return criarConsultaSupabaseMock(competencias);
        }

        if (tabela === "certidao_mensal_itens") {
            return criarConsultaSupabaseMock(itens);
        }

        if (
            tabela ===
            "certidao_mensal_perfil_documental_regras"
        ) {
            const respostaPerfilDocumental = {
                data: [],
                error: null,
            };

            const consultaPerfilDocumental = {
                select() {
                    return consultaPerfilDocumental;
                },

                eq() {
                    return consultaPerfilDocumental;
                },

                neq() {
                    return consultaPerfilDocumental;
                },

                is() {
                    return consultaPerfilDocumental;
                },

                in() {
                    return consultaPerfilDocumental;
                },

                or() {
                    return consultaPerfilDocumental;
                },

                match() {
                    return consultaPerfilDocumental;
                },

                order() {
                    return consultaPerfilDocumental;
                },

                limit() {
                    return consultaPerfilDocumental;
                },

                range() {
                    return consultaPerfilDocumental;
                },

                throwOnError() {
                    return consultaPerfilDocumental;
                },

                maybeSingle() {
                    return Promise.resolve({
                        data: null,
                        error: null,
                    });
                },

                single() {
                    return Promise.resolve({
                        data: null,
                        error: null,
                    });
                },

                then(resolve, reject) {
                    return Promise.resolve(
                        respostaPerfilDocumental,
                    ).then(
                        resolve,
                        reject,
                    );
                },
            };

            return consultaPerfilDocumental;
        }
        throw new Error(`Tabela inesperada no teste: ${tabela}`);
    },
};

const relatorioCarregado =
    await carregarDadosRelatorioAnualCertidaoMensal({
        ano: 2026,
        empresas,
        colaboradores,
        clienteSupabase: clienteSupabaseMock,
        agora: new Date("2026-08-06T12:00:00-03:00"),
    });

assert.deepEqual(
    tabelasConsultadas,
    [
        "certidao_mensal_perfil_documental_regras",
        "certidao_mensal_competencias",
        "certidao_mensal_competencias",
        "certidao_mensal_competencias",
        "certidao_mensal_itens",
    ],
    "O carregador deve consultar a janela temporal de competências e os itens em modo exclusivamente de leitura.",
);
assert.equal(
    relatorioCarregado.empresas.length,
    2,
    "O carregamento Supabase simulado deve manter todas as empresas fiscalizáveis.",
);

const COMPETENCIA_TEMPORAL_AGO =
    "competencia-temporal-ago-2026";

const ITEM_TEMPORAL_CND =
    "item-temporal-cnd-2026";

const VERSAO_TEMPORAL_CND =
    "versao-temporal-cnd-2026";

const competenciasTemporais = [
    {
        id:
            COMPETENCIA_TEMPORAL_AGO,
        empresa_id:
            EMPRESA_A,
        competencia:
            "2026-08-01",
        status:
            "ABERTA",
        resumo:
            null,
    },
];

const itensTemporais = [
    {
        id:
            ITEM_TEMPORAL_CND,
        competencia_id:
            COMPETENCIA_TEMPORAL_AGO,
        tipo_documento:
            "cnd-federal",
        origem:
            "UPLOAD",
        status:
            "CONFORME",
        versao_atual_id:
            VERSAO_TEMPORAL_CND,
    },
];

const versoesTemporais = [
    {
        id:
            VERSAO_TEMPORAL_CND,
        item_id:
            ITEM_TEMPORAL_CND,
        numero_versao:
            1,
        bucket_id:
            "documentos-empresas",
        caminho_storage:
            "teste/cnd-temporal.pdf",
        nome_original:
            "cnd-temporal.pdf",
        status_resultado:
            "CONFORME",
        diagnostico: {
            avaliacao: {
                dadosTemporais: {
                    dataEmissaoIso:
                        "2026-01-05",
                    dataValidadeIso:
                        "2026-06-30",
                },
            },
        },
        payload:
            {},
        criado_em:
            "2026-08-01T12:00:00.000Z",
    },
];

const tabelasTemporaisConsultadas =
    [];

const clienteSupabaseTemporalMock = {
    from(tabela) {
        tabelasTemporaisConsultadas.push(
            tabela
        );

        if (
            tabela ===
            "certidao_mensal_competencias"
        ) {
            return criarConsultaSupabaseMock(
                competenciasTemporais
            );
        }

        if (
            tabela ===
            "certidao_mensal_itens"
        ) {
            return criarConsultaSupabaseMock(
                itensTemporais
            );
        }

        if (
            tabela ===
            "certidao_mensal_versoes"
        ) {
            return criarConsultaSupabaseMock(
                versoesTemporais
            );
        }

        if (
            tabela ===
            "certidao_mensal_perfil_documental_regras"
        ) {
            const respostaPerfilDocumentalTemporal = {
                data: [],
                error: null,
            };

            const consultaPerfilDocumentalTemporal = {
                select() {
                    return consultaPerfilDocumentalTemporal;
                },

                eq() {
                    return consultaPerfilDocumentalTemporal;
                },

                neq() {
                    return consultaPerfilDocumentalTemporal;
                },

                is() {
                    return consultaPerfilDocumentalTemporal;
                },

                in() {
                    return consultaPerfilDocumentalTemporal;
                },

                or() {
                    return consultaPerfilDocumentalTemporal;
                },

                match() {
                    return consultaPerfilDocumentalTemporal;
                },

                order() {
                    return consultaPerfilDocumentalTemporal;
                },

                limit() {
                    return consultaPerfilDocumentalTemporal;
                },

                range() {
                    return consultaPerfilDocumentalTemporal;
                },

                throwOnError() {
                    return consultaPerfilDocumentalTemporal;
                },

                maybeSingle() {
                    return Promise.resolve({
                        data: null,
                        error: null,
                    });
                },

                single() {
                    return Promise.resolve({
                        data: null,
                        error: null,
                    });
                },

                then(resolve, reject) {
                    return Promise.resolve(
                        respostaPerfilDocumentalTemporal,
                    ).then(
                        resolve,
                        reject,
                    );
                },
            };

            return consultaPerfilDocumentalTemporal;
        }
        throw new Error(
            `Tabela inesperada no teste temporal: ${tabela}`
        );
    },
};

const relatorioTemporalCarregado =
    await carregarDadosRelatorioAnualCertidaoMensal({
        ano:
            2026,
        empresas,
        colaboradores,
        clienteSupabase:
            clienteSupabaseTemporalMock,
        agora:
            new Date(
                "2026-08-06T12:00:00-03:00"
            ),
    });

assert.deepEqual(
    tabelasTemporaisConsultadas,
    [
        "certidao_mensal_perfil_documental_regras",
        "certidao_mensal_competencias",
        "certidao_mensal_competencias",
        "certidao_mensal_competencias",
        "certidao_mensal_itens",
        "certidao_mensal_versoes",
    ],
    "O carregador temporal deve consultar competências, itens e as versões atuais necessárias, somente em leitura.",
);

const empresaTemporal =
    relatorioTemporalCarregado
        .empresas
        .find(
            (empresa) =>
                empresa.id ===
                EMPRESA_A
        );

assert.ok(
    empresaTemporal,
    "A empresa do cenário temporal deve permanecer no relatório.",
);

assert.deepEqual(
    {
        conformes:
            empresaTemporal
                .meses[2]
                .conformes,
        pendentes:
            empresaTemporal
                .meses[2]
                .pendentes,
    },
    {
        conformes:
            1,
        pendentes:
            14,
    },
    "MAR/2026 deve reconhecer a CND cadastrada em AGO/2026 porque ela já havia sido emitida e permanecia válida no último dia de março.",
);
const html = gerarHtmlRelatorioAnualCertidaoMensal(relatorio);

assert.match(
    html,
    /Relatório Anual de Pendências Documentais/,
);
assert.match(html, /Visão anual por empresa/);
assert.match(html, /Ano de referência<\/small>\s*<strong>2026<\/strong>/);
assert.match(html, /<small>Conforme<\/small>\s*<strong>\d+%<\/strong>/);
assert.match(html, /<small>Pendente<\/small>\s*<strong>\d+%<\/strong>/);
assert.match(html, /Funcionários:\s*<strong>2<\/strong>/);
assert.match(html, /empresa-card/);
assert.match(
    html,
    /empresa-dados h2[\s\S]*text-overflow:\s*ellipsis[\s\S]*white-space:\s*nowrap/,
    "O nome da empresa deve permanecer em uma única linha e ocultar o excedente.",
);
assert.match(html, /36\.288\.944\/0001-53/);
assert.match(html, /marca-safescan__simbolo/);
assert.match(html, /resumo-card--ano/);
assert.match(html, /resumo-card--conforme/);
assert.match(html, /resumo-card--pendente/);
assert.match(html, /Página 1 de 1/);
assert.match(html, />\s*NOV\s*<\/div>/i);
assert.match(html, />\s*DEZ\s*<\/div>/i);
assert.match(html, /grade-cabecalho--status[^>]*>\s*Situação\s*<\/div>/);
assert.match(html, /grade-cabecalho--total[^>]*>\s*Total\s*<\/div>/);
assert.match(
    html,
    /\.linha-status\s*\{[\s\S]*justify-content:\s*center;[\s\S]*text-align:\s*center;/,
    "Os rótulos Conforme e Pendente devem ficar centralizados.",
);
assert.match(
    html,
    /\.relatorio\s*\{[\s\S]*width:\s*min\(980px,\s*100%\)/,
    "A pré-visualização deve usar largura compacta sem alterar a proporção da folha A4.",
);

assert.match(
    html,
    /\.marca-contratante\s*\{[\s\S]*width:\s*auto;[\s\S]*max-width:\s*104px;[\s\S]*height:\s*46px;[\s\S]*padding:\s*3px\s+5px;/,
    "O fundo branco do logo deve acompanhar de perto a largura real da marca.",
);

assert.match(
    html,
    /\.marca-contratante \.empresa-logo__imagem\s*\{[\s\S]*width:\s*auto;[\s\S]*height:\s*100%;[\s\S]*max-width:\s*96px;/,
    "O logo do cabeçalho deve preservar sua proporção original.",
);

assert.match(
    html,
    /@media print[\s\S]*\.marca-contratante\s*\{[\s\S]*width:\s*auto;[\s\S]*max-width:\s*27mm;[\s\S]*height:\s*11\.8mm;[\s\S]*padding:\s*0\.6mm\s+0\.8mm;/,
    "Na impressão, a moldura branca também deve acompanhar a proporção do logo.",
);
assert.match(
    html,
    /\.pagina-relatorio\s*\{[\s\S]*aspect-ratio:\s*297\s*\/\s*210/,
    "Cada página exibida na tela deve respeitar a proporção física do A4 horizontal.",
);
assert.match(
    html,
    /\.pagina-relatorio\s*\{[\s\S]*grid-template-rows:\s*88px\s+58px\s+minmax\(0,\s*1fr\)\s+24px/,
    "Cabeçalho, resumo, empresas e rodapé devem ocupar a folha A4 sem achatamento.",
);
assert.match(
    html,
    /\.titulo-relatorio\s*\{[\s\S]*padding-right:\s*0;/,
    "O cabeçalho não pode reservar uma faixa lateral que force a quebra do título.",
);
assert.match(
    html,
    /\.titulo-relatorio h1\s*\{[\s\S]*white-space:\s*nowrap;/,
    "O título do cabeçalho deve permanecer em uma única linha.",
);
assert.match(
    html,
    /\.empresas\s*\{[\s\S]*grid-template-rows:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)[\s\S]*align-content:\s*start;/,
    "A folha deve reservar sete faixas fixas, impedindo que poucos cards sejam esticados para ocupar toda a página.",
);
assert.match(
    html,
    /@media\s*\(max-width:\s*900px\)[\s\S]*aspect-ratio:\s*auto[\s\S]*grid-template-rows:\s*repeat\(var\(--empresas-na-pagina\),\s*96px\)/,
    "Em telas estreitas, a pré-visualização deve voltar ao fluxo compacto e responsivo.",
);
assert.match(
    html,
    /@page\s*\{[\s\S]*size:\s*A4\s+landscape/,
    "A impressão deve declarar explicitamente A4 horizontal.",
);
assert.match(
    html,
    /@media print[\s\S]*\.pagina-relatorio\s*\{[\s\S]*width:\s*297mm;[\s\S]*height:\s*210mm;/,
    "A página impressa deve usar exatamente 297 mm por 210 mm.",
);
assert.match(
    html,
    /Ciranda Ecológica &lt;Teste&gt;/,
    "O nome da empresa deve ser escapado no HTML.",
);
assert.doesNotMatch(
    html,
    />Em análise</i,
    "A categoria Em análise não pode aparecer no relatório aprovado.",
);
assert.doesNotMatch(
    html,
    />Vencido</i,
    "A categoria Vencido não pode aparecer no relatório aprovado.",
);
assert.doesNotMatch(
    html,
    /Resumo geral/i,
    "O resumo geral inferior foi removido do modelo aprovado.",
);
assert.doesNotMatch(
    html,
    /overflow-x:\s*auto/i,
    "O relatório anual não pode criar rolagem horizontal interna.",
);
assert.doesNotMatch(
    html,
    /min-width:\s*900px/i,
    "A tabela anual não pode depender de largura mínima que corte Nov, Dez e Total.",
);
assert.doesNotMatch(
    html,
    /marca-escudo/i,
    "O ícone genérico anterior deve ser removido.",
);

const empresasParaPaginacao = Array.from(
    { length: 8 },
    (_, indice) => ({
        ...relatorio.empresas[indice % relatorio.empresas.length],
        id: `empresa-paginacao-${indice + 1}`,
        nome: `Empresa de paginação ${indice + 1}`,
    }),
);
const paginasDistribuidas = distribuirEmpresasEmPaginas(
    empresasParaPaginacao,
);

assert.deepEqual(
    paginasDistribuidas.map((pagina) => pagina.length),
    [7, 1],
    "Oito empresas devem preencher sete vagas na primeira folha e levar somente a empresa restante para a segunda.",
);

const htmlOitoEmpresas = gerarHtmlRelatorioAnualCertidaoMensal({
    ...relatorio,
    empresas: empresasParaPaginacao,
});

assert.equal(
    (htmlOitoEmpresas.match(/class="pagina-relatorio"/g) || []).length,
    2,
    "Oito empresas devem gerar exatamente duas folhas A4.",
);
assert.equal(
    (htmlOitoEmpresas.match(/class="empresa-card"/g) || []).length,
    8,
    "Todas as empresas devem permanecer no relatório paginado.",
);
assert.match(htmlOitoEmpresas, /Página 1 de 2/);
assert.match(htmlOitoEmpresas, /Página 2 de 2/);
assert.equal(
    (htmlOitoEmpresas.match(/class="marca-safescan__simbolo"/g) || []).length,
    2,
    "O cabeçalho SafeScan deve ser repetido em todas as páginas.",
);
assert.equal(
    (htmlOitoEmpresas.match(/Gerado pelo SafeScan Brasil/g) || []).length,
    2,
    "O rodapé deve ser repetido em todas as páginas.",
);

const empresasParaVinte = Array.from(
    { length: 20 },
    (_, indice) => ({
        ...relatorio.empresas[indice % relatorio.empresas.length],
        id: `empresa-vinte-${indice + 1}`,
        nome: `Empresa dinâmica ${indice + 1}`,
    }),
);
const paginasVinteEmpresas = distribuirEmpresasEmPaginas(
    empresasParaVinte,
);

assert.deepEqual(
    paginasVinteEmpresas.map((pagina) => pagina.length),
    [7, 7, 6],
    "Vinte empresas devem ser distribuídas dinamicamente em três páginas, sem limitar o relatório a quatro empresas por folha.",
);

const htmlVinteEmpresas = gerarHtmlRelatorioAnualCertidaoMensal({
    ...relatorio,
    empresas: empresasParaVinte,
});

assert.equal(
    (htmlVinteEmpresas.match(/class="pagina-relatorio"/g) || []).length,
    3,
    "Vinte empresas devem gerar três folhas A4 dinâmicas.",
);
assert.equal(
    (htmlVinteEmpresas.match(/class="empresa-card"/g) || []).length,
    20,
    "Nenhuma empresa pode ser omitida durante a paginação dinâmica.",
);
assert.match(htmlVinteEmpresas, /Página 1 de 3/);
assert.match(htmlVinteEmpresas, /Página 2 de 3/);
assert.match(htmlVinteEmpresas, /Página 3 de 3/);
assert.match(
    htmlVinteEmpresas,
    /\.empresas\s*\{[\s\S]*gap:\s*5px;/,
    "A visualização deve reduzir somente o espaço vertical entre empresas.",
);
assert.match(
    htmlVinteEmpresas,
    /@media print[\s\S]*\.empresas\s*\{[\s\S]*gap:\s*1\.2mm;/,
    "A impressão deve usar espaçamento compacto para comportar mais empresas na folha A4.",
);

const paginaFonte = fs.readFileSync(
    path.join(
        raizProjeto,
        "src/features/certidao-mensal-documental/pages/CertidaoMensalDocumentalPage.jsx",
    ),
    "utf8",
);
const heroFonte = fs.readFileSync(
    path.join(
        raizProjeto,
        "src/features/certidao-mensal-documental/components/CertidaoMensalHero.jsx",
    ),
    "utf8",
);
const painelCompetenciaFonte = fs.readFileSync(
    path.join(
        raizProjeto,
        "src/features/certidao-mensal-documental/components/CompetenciaDocumentalPanel.jsx",
    ),
    "utf8",
);
const dadosAnuaisFonte = fs.readFileSync(
    path.join(
        raizProjeto,
        "src/features/certidao-mensal-documental/services/certidaoMensalRelatorioAnualDataService.js",
    ),
    "utf8",
);
const cssFonte = fs.readFileSync(
    path.join(
        raizProjeto,
        "src/styles/pages/certidao-mensal-documental.css",
    ),
    "utf8",
);

assert.match(
    paginaFonte,
    /certidaoMensalRelatorioAnualService\.js/,
    "A página precisa chamar o serviço anual aprovado.",
);
assert.match(
    paginaFonte,
    /certidaoMensalRelatorioService\.js/,
    "A impressão individual da empresa precisa continuar disponível.",
);
assert.match(
    paginaFonte,
    /empresas:\s*\n\s*empresasVisiveisCompetencia,\s*\n\s*colaboradores,/,
    "O relatório anual deve receber as empresas exigíveis da competência e os colaboradores.",
);
assert.match(
    paginaFonte,
    /onImprimirRelatorioEmpresa=/,
    "A página deve entregar a ação individual ao painel da competência.",
);
assert.match(
    heroFonte,
    /Relatório anual/,
    "O botão do Hero deve identificar o relatório anual.",
);
assert.match(
    heroFonte,
    /Gerando relatório\.\.\./,
    "O botão deve informar o estado de carregamento.",
);
assert.match(
    painelCompetenciaFonte,
    /Imprimir empresa/,
    "O botão individual deve aparecer no cabeçalho da empresa selecionada.",
);
assert.match(
    painelCompetenciaFonte,
    /onImprimirRelatorioEmpresa/,
    "O painel deve receber a função de impressão individual.",
);
assert.match(
    cssFonte,
    /certidao-mensal-checklist__print/,
    "O botão individual deve possuir estilo próprio e responsivo.",
);
assert.match(
    dadosAnuaisFonte,
    /TOTAL_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL/,
    "O relatório deve possuir uma regra explícita para os quinze documentos externos.",
);
assert.match(
    dadosAnuaisFonte,
    /id, competencia_id, tipo_documento, origem, status, versao_atual_id/,
    "A leitura anual deve carregar o ID do item e a versão atual necessária para a resolução temporal.",
);
assert.match(
    dadosAnuaisFonte,
    /certidao_mensal_versoes/,
    "A leitura anual deve consultar as versões documentais necessárias à resolução temporal.",
);
assert.match(
    dadosAnuaisFonte,
    /resolverDocumentoNaCompetencia/,
    "O relatório anual deve usar a mesma regra oficial de resolução documental por competência.",
);
assert.match(
    cssFonte,
    /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/,
    "As três ações do cabeçalho devem ocupar o espaço disponível sem buracos.",
);
assert.match(
    cssFonte,
    /certidao-mensal-checklist__history\s*\{[\s\S]*justify-content:\s*center;/,
    "O conteúdo do botão Histórico deve ficar centralizado.",
);
assert.match(
    cssFonte,
    /certidao-mensal-checklist__header-actions > button\s*\{[\s\S]*text-align:\s*center;/,
    "As ações do cabeçalho devem manter o conteúdo centralizado.",
);

// D24.9 — recorte temporal das empresas no relatório anual
const { default: assertVigenciaAnual } =
    await import("node:assert/strict");

const {
    consolidarRelatorioAnualCertidaoMensal:
        consolidarRelatorioAnualVigenciaEmpresas,
} = await import(
    "../src/features/certidao-mensal-documental/services/certidaoMensalRelatorioAnualDataService.js"
);

const empresasVigenciaAnual = [
    {
        id: "empresa-encerrada-2024",
        nome: "ENCERRADA EM 2024",
        tipo_empresa: "Contratada",
        data_inicio_contrato: "2024-01-01",
        data_fim_contrato: "2024-12-31",
    },
    {
        id: "empresa-inicio-maio-2025",
        nome: "INÍCIO EM MAIO DE 2025",
        tipo_empresa: "Contratada",
        data_inicio_contrato: "2025-05-01",
        data_fim_contrato: "",
    },
    {
        id: "empresa-parcial-2025",
        nome: "ATIVA ATÉ MARÇO DE 2025",
        tipo_empresa: "Contratada",
        data_inicio_contrato: "2024-11-01",
        data_fim_contrato: "2025-03-31",
    },
    {
        id: "empresa-ano-2025-sem-documentos",
        nome: "ATIVA EM 2025 SEM DOCUMENTOS",
        tipo_empresa: "Contratada",
        data_inicio_contrato: "2025-01-01",
        data_fim_contrato: "2025-12-31",
    },
    {
        id: "empresa-inicio-2026",
        nome: "INÍCIO SOMENTE EM 2026",
        tipo_empresa: "Contratada",
        data_inicio_contrato: "2026-01-01",
        data_fim_contrato: "",
    },
];

const relatorioVigencia2025 =
    consolidarRelatorioAnualVigenciaEmpresas({
        ano: 2025,
        empresas: empresasVigenciaAnual,
        colaboradores: [],
        competencias: [],
        itens: [],
        versoes: [],
        regrasPerfil: [],
        agora: new Date("2026-08-13T12:00:00-03:00"),
    });

assertVigenciaAnual.deepEqual(
    relatorioVigencia2025.empresas.map(
        (empresa) => empresa.id,
    ),
    [
        "empresa-ano-2025-sem-documentos",
        "empresa-parcial-2025",
        "empresa-inicio-maio-2025",
    ].sort((a, b) => {
        const empresaA = empresasVigenciaAnual.find(
            (empresa) => empresa.id === a,
        );
        const empresaB = empresasVigenciaAnual.find(
            (empresa) => empresa.id === b,
        );

        return empresaA.nome.localeCompare(
            empresaB.nome,
            "pt-BR",
            { sensitivity: "base" },
        );
    }),
    "Somente empresas com ao menos uma competência contratualmente aplicável em 2025 devem permanecer no relatório.",
);

const empresaMaio2025 =
    relatorioVigencia2025.empresas.find(
        (empresa) =>
            empresa.id ===
            "empresa-inicio-maio-2025",
    );

assertVigenciaAnual.ok(
    empresaMaio2025,
    "Empresa iniciada em maio de 2025 deve aparecer no relatório de 2025.",
);

assertVigenciaAnual.equal(
    empresaMaio2025.meses[3].exigivel,
    false,
    "ABR/2025 deve permanecer fora da vigência da empresa iniciada em maio.",
);

assertVigenciaAnual.equal(
    empresaMaio2025.meses[4].exigivel,
    true,
    "MAI/2025 deve entrar na vigência da empresa.",
);

assertVigenciaAnual.equal(
    empresaMaio2025.meses[3].pendentes,
    null,
    "ABR/2025 não pode gerar pendência antes do início do contrato.",
);

assertVigenciaAnual.ok(
    Number(empresaMaio2025.meses[4].pendentes) > 0,
    "MAI/2025 deve continuar cobrando os documentos aplicáveis quando não houver envio.",
);

const empresaSemDocumentos2025 =
    relatorioVigencia2025.empresas.find(
        (empresa) =>
            empresa.id ===
            "empresa-ano-2025-sem-documentos",
    );

assertVigenciaAnual.ok(
    empresaSemDocumentos2025,
    "Empresa vigente no ano deve permanecer mesmo sem nenhum documento enviado.",
);

const relatorioFuturo2026 =
    consolidarRelatorioAnualVigenciaEmpresas({
        ano: 2026,
        empresas: [
            {
                id: "empresa-outubro-2026",
                nome: "INÍCIO EM OUTUBRO DE 2026",
                tipo_empresa: "Contratada",
                data_inicio_contrato: "2026-10-01",
                data_fim_contrato: "",
            },
        ],
        colaboradores: [],
        competencias: [],
        itens: [],
        versoes: [],
        regrasPerfil: [],
        agora: new Date("2026-08-13T12:00:00-03:00"),
    });

assertVigenciaAnual.equal(
    relatorioFuturo2026.empresas.length,
    0,
    "Empresa cujo contrato começa apenas em competência futura ainda não deve aparecer no relatório anual corrente.",
);
console.log("CERTIDÃO MENSAL — RELATÓRIO ANUAL POR EMPRESA APROVADO");
console.log(
    "Cenários validados: paginação sequencial para 20 empresas em 3 folhas (7 + 7 + 6), oito empresas em 7 + 1, sete faixas fixas sem esticar cards, título do cabeçalho em uma linha, quinze documentos externos, impressão A4 horizontal, janeiro a dezembro e Total.",
);
console.log(
    "Nenhuma conexão real, alteração de banco, impressão, deploy ou e-mail foi executado.",
);
