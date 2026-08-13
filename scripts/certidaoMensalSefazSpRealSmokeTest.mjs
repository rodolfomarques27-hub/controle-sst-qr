import assert from "node:assert/strict";

import {
    classificarDocumentoCertidao,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentClassifier.js";

import {
    executarPreAvaliacaoDocumental,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentPreAssessment.js";

import {
    resultadoLaboratorioCertidaoPodeSerPersistido,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalPersistencePayloadService.js";

const empresa = {
    nome:
        "RIBEIRO AQUINO",
    cnpj:
        "13.697.181/0001-07",
};

const documentoEsperado = {
    id:
        "cnd-estadual",
    titulo:
        "CND Estadual",
};

function avaliar(
    texto,
    dataReferencia
) {
    return (
        executarPreAvaliacaoDocumental({
            textoExtraido:
                texto,
            documentoEsperado,
            empresaEsperada:
                empresa,
            dataReferencia,
        })
    );
}

function podePersistir(
    preAvaliacaoDocumental
) {
    return (
        resultadoLaboratorioCertidaoPodeSerPersistido({
            sucesso:
                true,
            preAvaliacaoDocumental,
        })
    );
}

const textoSefazReal = [
    "Secretaria da Fazenda e Planejamento do Estado de São Paulo",
    "",
    "Débitos Tributários Não Inscritos na Dívida Ativa do Estado de São Paulo",
    "",
    "CNPJ: 13.697.181/0001-07",
    "",
    "Ressalvado o direito da Secretaria da Fazenda e Planejamento do Estado de São Paulo",
    "de apurar débitos de responsabilidade da pessoa jurídica acima identificada,",
    "é certificado que não constam débitos declarados ou apurados pendentes",
    "de inscrição na Dívida Ativa.",
    "",
    "Certidão nº",
    "26011030003-15",
    "",
    "Data e hora da emissão",
    "19/01/2026 10:45:53",
    "",
    "Validade",
    "6 (seis) meses, contados da data de sua expedição.",
    "",
    "A aceitação desta certidão está condicionada à verificação de sua autenticidade",
    "no sítio www.pfe.fazenda.sp.gov.br",
].join("\n");

assert.equal(
    classificarDocumentoCertidao(
        textoSefazReal
    ).id,
    "cnd-estadual"
);

const real =
    avaliar(
        textoSefazReal,
        new Date(
            "2026-01-31T12:00:00.000Z"
        )
    );

assert.equal(
    real.avaliacao.codigo,
    "COMPATIVEL_CONSULTA_OFICIAL"
);

assert.equal(
    real.avaliacao
        .fonteOficial.codigo,
    "SEFAZ"
);

assert.equal(
    real.avaliacao
        .cnpjDocumento,
    "13.697.181/0001-07"
);

assert.equal(
    real.avaliacao
        .dadosTemporais
        .dataEmissaoIso,
    "2026-01-19"
);

assert.equal(
    real.avaliacao
        .dadosTemporais
        .horaEmissao,
    "10:45:53"
);

assert.equal(
    real.avaliacao
        .dadosTemporais
        .prazoValidadeMeses,
    6
);

assert.equal(
    real.avaliacao
        .dadosTemporais
        .prazoValidadeDias,
    null
);

assert.equal(
    real.avaliacao
        .dadosTemporais
        .prazoValidadeAmbiguo,
    false
);

assert.equal(
    real.avaliacao
        .dadosTemporais
        .unidadePrazoValidade,
    "MESES"
);

assert.equal(
    real.avaliacao
        .dadosTemporais
        .dataValidadeIso,
    "2026-07-19"
);

assert.equal(
    real.avaliacao
        .dadosTemporais
        .dataValidade,
    "19/07/2026"
);

assert.equal(
    real.avaliacao
        .dadosTemporais
        .validadeCalculadaPorPrazo,
    true
);

assert.equal(
    real.avaliacao
        .dadosTemporais
        .origemValidade,
    "PRAZO_DECLARADO"
);

assert.equal(
    real.avaliacao
        .requerConsultaOficial,
    true
);

assert.equal(
    podePersistir(
        real
    ),
    true
);

const regraValidade =
    real.avaliacao
        .regras
        .find(
            (regra) =>
                regra.codigo ===
                "VALIDADE_DOCUMENTO"
        );

assert.equal(
    regraValidade?.status,
    "APROVADA"
);

assert.match(
    regraValidade?.mensagem || "",
    /6 meses/i
);

const textoSemDeclaracaoNegativa =
    textoSefazReal.replace(
        [
            "é certificado que não constam débitos declarados ou apurados pendentes",
            "de inscrição na Dívida Ativa.",
        ].join("\n"),
        [
            "a situação fiscal deverá ser confirmada",
            "mediante consulta ao órgão emissor.",
        ].join("\n")
    );

const semDeclaracaoNegativa =
    avaliar(
        textoSemDeclaracaoNegativa,
        new Date(
            "2026-01-31T12:00:00.000Z"
        )
    );

assert.equal(
    semDeclaracaoNegativa
        .avaliacao
        .fonteOficial.codigo,
    "SEFAZ"
);

assert.equal(
    semDeclaracaoNegativa
        .avaliacao
        .natureza.codigo,
    "NAO_IDENTIFICADA"
);

assert.equal(
    semDeclaracaoNegativa
        .avaliacao
        .natureza
        .documentalmenteCompativel,
    false
);

assert.equal(
    semDeclaracaoNegativa
        .avaliacao.codigo,
    "AVALIACAO_INCONCLUSIVA"
);

const validadeExplicita =
    avaliar(
        textoSefazReal +
            "\nVALIDADE: 18/07/2026",
        new Date(
            "2026-01-31T12:00:00.000Z"
        )
    );

assert.equal(
    validadeExplicita
        .avaliacao
        .dadosTemporais
        .dataValidadeIso,
    "2026-07-18"
);

assert.equal(
    validadeExplicita
        .avaliacao
        .dadosTemporais
        .validadeCalculadaPorPrazo,
    false
);

assert.equal(
    validadeExplicita
        .avaliacao
        .dadosTemporais
        .origemValidade,
    "DATA_EXPLICITA"
);

assert.equal(
    validadeExplicita
        .avaliacao
        .dadosTemporais
        .unidadePrazoValidade,
    ""
);

const prazoGenerico =
    avaliar(
        textoSefazReal.replace(
            "Validade\n6 (seis) meses, contados da data de sua expedição.",
            "Prazo padrão de 6 meses."
        ),
        new Date(
            "2026-01-31T12:00:00.000Z"
        )
    );

assert.equal(
    prazoGenerico
        .avaliacao
        .dadosTemporais
        .prazoValidadeMeses,
    null
);

assert.equal(
    prazoGenerico
        .avaliacao
        .dadosTemporais
        .dataValidadeIso,
    ""
);

assert.equal(
    prazoGenerico
        .avaliacao.codigo,
    "AVALIACAO_INCONCLUSIVA"
);

const prazoAmbiguo =
    avaliar(
        textoSefazReal +
            "\nVALIDADE: 30 dias, contados da emissão.",
        new Date(
            "2026-01-31T12:00:00.000Z"
        )
    );

assert.equal(
    prazoAmbiguo
        .avaliacao
        .dadosTemporais
        .prazoValidadeMeses,
    6
);

assert.equal(
    prazoAmbiguo
        .avaliacao
        .dadosTemporais
        .prazoValidadeDias,
    30
);

assert.equal(
    prazoAmbiguo
        .avaliacao
        .dadosTemporais
        .prazoValidadeAmbiguo,
    true
);

assert.equal(
    prazoAmbiguo
        .avaliacao
        .dadosTemporais
        .dataValidadeIso,
    ""
);

assert.equal(
    prazoAmbiguo
        .avaliacao
        .dadosTemporais
        .validadeCalculadaPorPrazo,
    false
);

const fimDeMes =
    avaliar(
        textoSefazReal.replace(
            "19/01/2026 10:45:53",
            "31/08/2025 10:45:53"
        ),
        new Date(
            "2025-08-31T12:00:00.000Z"
        )
    );

assert.equal(
    fimDeMes
        .avaliacao
        .dadosTemporais
        .dataValidadeIso,
    "2026-02-28"
);

console.log(
    "SEFAZ/SP classificada                 : OK"
);

console.log(
    "Fonte SEFAZ                           : OK"
);

console.log(
    "Natureza pela redacao oficial          : NEGATIVA"
);

console.log(
    "Cabecalho SEFAZ isolado                : NAO BASTA"
);

console.log(
    "CNPJ completo                         : OK"
);

console.log(
    "Emissao                               : 19/01/2026"
);

console.log(
    "Hora                                  : 10:45:53"
);

console.log(
    "Prazo documental                      : 6 MESES"
);

console.log(
    "Validade por meses-calendario          : 19/07/2026"
);

console.log(
    "Conversao automatica para 180 dias     : NAO"
);

console.log(
    "Data explicita tem prioridade          : OK"
);

console.log(
    "Prazo generico nao cria validade       : OK"
);

console.log(
    "Prazo dias + meses fica ambiguo         : OK"
);

console.log(
    "31/08/2025 + 6 meses                   : 28/02/2026"
);

console.log(
    "Consulta oficial permanece             : OBRIGATORIA"
);

console.log(
    "Persistencia da SEFAZ valida            : PERMITIDA"
);

console.log(
    "certidaoMensalSefazSpRealSmokeTest: OK"
);