import assert from "node:assert/strict";

import {
    classificarDocumentoCertidao,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentClassifier.js";

import {
    executarPreAvaliacaoDocumental,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentPreAssessment.js";

const empresa = {
    id:
        "11111111-1111-4111-8111-111111111111",
    nome:
        "RIBEIRO AQUINO ENGENHARIA LTDA",
    cnpj:
        "13.697.181/0001-07",
};

const referencia =
    new Date(
        "2026-03-31T12:00:00.000Z"
    );

assert.equal(
    classificarDocumentoCertidao(`
        CERTIDÃO POSITIVA COM EFEITOS DE NEGATIVA
        DE DÉBITOS RELATIVOS AOS TRIBUTOS FEDERAIS
        E À DÍVIDA ATIVA DA UNIÃO
    `).id,
    "cnd-federal"
);

assert.equal(
    classificarDocumentoCertidao(`
        PODER JUDICIÁRIO
        JUSTIÇA DO TRABALHO
        CERTIDÃO NEGATIVA DE DÉBITOS TRABALHISTAS
    `).id,
    "cndt-trabalhista"
);

assert.notEqual(
    classificarDocumentoCertidao(`
        PODER JUDICIÁRIO
        JUSTIÇA DO TRABALHO
        CERTIDÃO ELETRÔNICA DE AÇÕES TRABALHISTAS
        Esta certidão não substitui certidão de débitos trabalhistas.
    `).id,
    "cndt-trabalhista",
    "CEAT nao pode ser confundida com CNDT."
);

const textoSefaz = `
SECRETARIA DA FAZENDA E PLANEJAMENTO
DO ESTADO DE SÃO PAULO

CERTIDÃO NEGATIVA DE DÉBITOS TRIBUTÁRIOS
NÃO INSCRITOS NA DÍVIDA ATIVA DO ESTADO DE SÃO PAULO

RAZÃO SOCIAL: RIBEIRO AQUINO ENGENHARIA LTDA
CNPJ: 13.697.181/0001-07

DATA DE EMISSÃO: 05/01/2026
VALIDADE: 30/06/2026
CÓDIGO DE CONTROLE: ABCD-1234-EFGH
`;

assert.equal(
    classificarDocumentoCertidao(
        textoSefaz
    ).id,
    "cnd-estadual"
);

const sefaz =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoSefaz,
        documentoEsperado: {
            id:
                "cnd-estadual",
            titulo:
                "CND Estadual",
        },
        empresaEsperada:
            empresa,
        dataReferencia:
            referencia,
    });

assert.equal(
    sefaz.avaliacao.codigo,
    "COMPATIVEL_CONSULTA_OFICIAL"
);

assert.equal(
    sefaz.avaliacao
        .fonteOficial.codigo,
    "SEFAZ"
);

assert.equal(
    sefaz.avaliacao
        .dadosTemporais
        .dataEmissaoIso,
    "2026-01-05"
);

assert.equal(
    sefaz.avaliacao
        .dadosTemporais
        .dataValidadeIso,
    "2026-06-30"
);

const textoPge = `
PROCURADORIA GERAL DO ESTADO DE SÃO PAULO

CERTIDÃO NEGATIVA DE DÉBITOS TRIBUTÁRIOS
DA DÍVIDA ATIVA DO ESTADO DE SÃO PAULO

RIBEIRO AQUINO ENGENHARIA LTDA
CNPJ 13.697.181/0001-07

EMITIDA EM 10/01/2026
VÁLIDA ATÉ 30/06/2026
CÓDIGO DE AUTENTICIDADE: PGE-2026-001122
`;

assert.equal(
    classificarDocumentoCertidao(
        textoPge
    ).id,
    "cnd-estadual"
);

const pge =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoPge,
        documentoEsperado: {
            id:
                "cnd-estadual",
            titulo:
                "CND Estadual",
        },
        empresaEsperada:
            empresa,
        dataReferencia:
            referencia,
    });

assert.equal(
    pge.avaliacao
        .fonteOficial.codigo,
    "PGE"
);

assert.equal(
    pge.avaliacao.codigo,
    "FONTE_ESTADUAL_INCOMPATIVEL"
);

assert.equal(
    pge.avaliacao
        .documentoIncompativel,
    true
);

assert.equal(
    pge.avaliacao
        .bloqueiaSubstituicao,
    true
);

const textoMunicipal = `
PREFEITURA MUNICIPAL DE SÃO JOSÉ DOS CAMPOS
SECRETARIA MUNICIPAL DA FAZENDA

CERTIDÃO NEGATIVA DE DÉBITOS MUNICIPAIS

RAZÃO SOCIAL: RIBEIRO AQUINO ENGENHARIA LTDA
CNPJ: 13.697.181/0001-07

EMISSÃO: 15/01/2026
VALIDADE: 30/06/2026
`;

assert.equal(
    classificarDocumentoCertidao(
        textoMunicipal
    ).id,
    "cnd-municipal"
);

const municipal =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoMunicipal,
        documentoEsperado: {
            id:
                "cnd-municipal",
            titulo:
                "CND Municipal",
        },
        empresaEsperada:
            empresa,
        dataReferencia:
            referencia,
    });

assert.equal(
    municipal.avaliacao
        .fonteOficial.codigo,
    "MUNICIPIO"
);

assert.equal(
    municipal.avaliacao.codigo,
    "COMPATIVEL_CONSULTA_OFICIAL"
);

const textoMunicipalSjcReal = `
PREFEITURA DE SÃO JOSÉ DOS CAMPOS
SECRETARIA DE GESTÃO ADMINISTRATIVA E FINANÇAS
COORDENADORIA TRIBUTÁRIA MOBILIÁRIA

CERTIDÃO DE DÉBITOS MUNICIPAIS
TRIBUTOS MOBILIÁRIOS E IMOBILIÁRIOS

CERTIFICA E DÁ FÉ, que não consta(m) até presente data,
débito(s) relativo(s) a Tributo(s) e Multa(s).

RIBEIRO AQUINO
CNPJ: 13.697.181/0001-07

Certidão concedida no dia 03/10/2025 às 09:49:55
Valido até: 01/04/2026
Chave para validação: 32663262E7DPB55

A autenticidade desta certidão deverá ser confirmada no site
da Prefeitura Municipal: http://www.sjc.sp.gov.br.

Decreto 10.951/03 de 24 de abril de 2003.
`;

const municipalSjcReal =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoMunicipalSjcReal,
        documentoEsperado: {
            id:
                "cnd-municipal",
            titulo:
                "CND Municipal",
        },
        empresaEsperada:
            empresa,
        dataReferencia:
            new Date(
                "2026-03-01T12:00:00.000Z"
            ),
    });

assert.equal(
    municipalSjcReal.classificacao.id,
    "cnd-municipal"
);

assert.equal(
    municipalSjcReal.avaliacao
        .natureza.codigo,
    "NEGATIVA"
);

assert.equal(
    municipalSjcReal.avaliacao.regras.find(
        (regra) =>
            regra.codigo ===
            "NATUREZA_CERTIDAO"
    )?.status,
    "APROVADA"
);

assert.equal(
    municipalSjcReal.avaliacao.codigo,
    "COMPATIVEL_CONSULTA_OFICIAL"
);

assert.equal(
    municipalSjcReal.avaliacao
        .dadosTemporais
        .dataEmissaoIso,
    "2025-10-03"
);

assert.equal(
    municipalSjcReal.avaliacao
        .dadosTemporais
        .horaEmissao,
    "09:49:55"
);

assert.equal(
    municipalSjcReal.avaliacao
        .dadosTemporais
        .dataValidadeIso,
    "2026-04-01"
);

assert.equal(
    municipalSjcReal.avaliacao
        .dadosTemporais
        .origemValidade,
    "DATA_EXPLICITA"
);

assert.equal(
    municipalSjcReal.avaliacao
        .codigoControle,
    "32663262E7DPB55"
);

assert.notEqual(
    municipalSjcReal.avaliacao
        .dadosTemporais
        .dataEmissaoIso,
    "2003-04-24"
);

const positiva =
    executarPreAvaliacaoDocumental({
        textoExtraido: `
            SECRETARIA DA FAZENDA DO ESTADO
            CERTIDÃO POSITIVA DE DÉBITOS TRIBUTÁRIOS DO ESTADO
            RIBEIRO AQUINO ENGENHARIA LTDA
            CNPJ: 13.697.181/0001-07
            EMISSÃO: 01/03/2026
            VALIDADE: 30/06/2026
        `,
        documentoEsperado: {
            id:
                "cnd-estadual",
            titulo:
                "CND Estadual",
        },
        empresaEsperada:
            empresa,
        dataReferencia:
            referencia,
    });

assert.equal(
    positiva.avaliacao.codigo,
    "CERTIDAO_POSITIVA"
);

console.log(
    "certidaoMensalCertidoesLocaisSmokeTest: OK"
);