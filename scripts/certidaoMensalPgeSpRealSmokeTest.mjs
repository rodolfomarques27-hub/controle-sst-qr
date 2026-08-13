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

const referencia =
    new Date(
        "2026-01-31T12:00:00.000Z"
    );

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

const textoPgeSpReal = [
    "PROCURADORIA GERAL DO ESTADO DE SÃO PAULO",
    "Procuradoria da Dívida Ativa",
    "",
    "Certidão Negativa de Débitos Inscritos da Dívida Ativa do Estado de São Paulo",
    "",
    "RIBEIRO AQUINO",
    "CNPJ Base: 13.697.181",
    "",
    "Data e hora da emissão",
    "19/01/2026 11:03:50",
    "",
    "Validade",
    "30 (TRINTA) dias, contados da emissão.",
].join("\n");

assert.equal(
    classificarDocumentoCertidao(
        textoPgeSpReal
    ).id,
    "cnd-estadual"
);

const pge =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoPgeSpReal,
        documentoEsperado,
        empresaEsperada:
            empresa,
        dataReferencia:
            referencia,
    });

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

assert.equal(
    pge.avaliacao
        .fonteOficial.codigo,
    "PGE"
);

assert.equal(
    pge.avaliacao
        .cnpjDocumento,
    "13.697.181"
);

assert.equal(
    pge.avaliacao
        .cnpjDocumentoTipo,
    "CNPJ_BASE"
);

assert.equal(
    pge.avaliacao
        .dadosTemporais
        .dataEmissaoIso,
    "2026-01-19"
);

assert.equal(
    pge.avaliacao
        .dadosTemporais
        .horaEmissao,
    "11:03:50"
);

assert.equal(
    pge.avaliacao
        .dadosTemporais
        .prazoValidadeDias,
    30
);

assert.equal(
    pge.avaliacao
        .dadosTemporais
        .dataValidadeIso,
    "2026-02-18"
);

assert.equal(
    pge.avaliacao
        .dadosTemporais
        .origemValidade,
    "PRAZO_DECLARADO"
);

assert.equal(
    pge.avaliacao
        .requerConsultaOficial,
    false
);

assert.equal(
    podePersistir(
        pge
    ),
    false
);

const regraOrgaoPge =
    pge.avaliacao
        .regras
        .find(
            (regra) =>
                regra.codigo ===
                "ORGAO_EMISSOR"
        );

assert.equal(
    regraOrgaoPge?.status,
    "REPROVADA"
);

const textoBaseDivergente =
    textoPgeSpReal.replace(
        "CNPJ Base: 13.697.181",
        "CNPJ Base: 99.999.999"
    );

const baseDivergente =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoBaseDivergente,
        documentoEsperado,
        empresaEsperada:
            empresa,
        dataReferencia:
            referencia,
    });

assert.equal(
    baseDivergente
        .avaliacao.codigo,
    "DIVERGENCIA_CNPJ"
);

assert.equal(
    baseDivergente
        .avaliacao
        .bloqueiaSubstituicao,
    true
);

assert.equal(
    podePersistir(
        baseDivergente
    ),
    false
);

const textoSemRotuloBase =
    textoPgeSpReal.replace(
        "CNPJ Base: 13.697.181",
        "Número de controle: 13.697.181"
    );

const semRotuloBase =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoSemRotuloBase,
        documentoEsperado,
        empresaEsperada:
            empresa,
        dataReferencia:
            referencia,
    });

assert.equal(
    semRotuloBase
        .avaliacao
        .cnpjDocumento,
    ""
);

assert.equal(
    podePersistir(
        semRotuloBase
    ),
    false
);

const textoValidadeExplicita =
    textoPgeSpReal +
    "\nVALIDADE: 28/02/2026";

const validadeExplicita =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoValidadeExplicita,
        documentoEsperado,
        empresaEsperada:
            empresa,
        dataReferencia:
            referencia,
    });

assert.equal(
    validadeExplicita
        .avaliacao
        .dadosTemporais
        .dataValidadeIso,
    "2026-02-28"
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

const textoPrazoGenerico =
    textoPgeSpReal.replace(
        "Validade\n30 (TRINTA) dias, contados da emissão.",
        "Prazo padrão de 30 dias."
    );

const prazoGenerico =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoPrazoGenerico,
        documentoEsperado,
        empresaEsperada:
            empresa,
        dataReferencia:
            referencia,
    });

assert.equal(
    prazoGenerico
        .avaliacao
        .dadosTemporais
        .dataValidadeIso,
    ""
);

const textoSefaz = [
    "SECRETARIA DA FAZENDA E PLANEJAMENTO",
    "DO ESTADO DE SÃO PAULO",
    "",
    "CERTIDÃO NEGATIVA DE DÉBITOS TRIBUTÁRIOS",
    "NÃO INSCRITOS NA DÍVIDA ATIVA DO ESTADO DE SÃO PAULO",
    "",
    "RAZÃO SOCIAL: RIBEIRO AQUINO",
    "CNPJ: 13.697.181/0001-07",
    "",
    "DATA DE EMISSÃO: 05/01/2026",
    "VALIDADE: 30/06/2026",
    "CÓDIGO DE CONTROLE: ABCD-1234-EFGH",
].join("\n");

const sefaz =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoSefaz,
        documentoEsperado,
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
        .documentoIncompativel,
    false
);

assert.equal(
    sefaz.avaliacao
        .bloqueiaSubstituicao,
    false
);

assert.equal(
    podePersistir(
        sefaz
    ),
    true
);

const textoFederalCnpjDivergente = [
    "CERTIDÃO NEGATIVA DE DÉBITOS RELATIVOS AOS TRIBUTOS FEDERAIS",
    "E À DÍVIDA ATIVA DA UNIÃO",
    "CNPJ: 99.999.999/0001-99",
    "EMITIDA EM: 05/01/2026",
    "VÁLIDA ATÉ: 30/06/2026",
].join("\n");

const federalCnpjDivergente =
    executarPreAvaliacaoDocumental({
        textoExtraido:
            textoFederalCnpjDivergente,
        documentoEsperado: {
            id:
                "cnd-federal",
            titulo:
                "CND Federal",
        },
        empresaEsperada:
            empresa,
        dataReferencia:
            referencia,
    });

assert.equal(
    federalCnpjDivergente
        .avaliacao.codigo,
    "DIVERGENCIA_CNPJ"
);

assert.equal(
    podePersistir(
        federalCnpjDivergente
    ),
    false
);

console.log(
    "PGE/SP reconhecida na familia estadual : OK"
);

console.log(
    "PGE/SP no slot CND Estadual            : BLOQUEADA"
);

console.log(
    "PGE pode persistir                     : NAO"
);

console.log(
    "CNPJ Base                              : PRESERVADO"
);

console.log(
    "CNPJ divergente                        : BLOQUEADO"
);

console.log(
    "CNPJ divergente federal                : BLOQUEADO"
);

console.log(
    "SEFAZ/SP valida                        : ACEITA"
);

console.log(
    "Data explicita tem prioridade          : OK"
);

console.log(
    "Prazo generico nao cria validade       : OK"
);

console.log(
    "certidaoMensalPgeSpRealSmokeTest: OK"
);