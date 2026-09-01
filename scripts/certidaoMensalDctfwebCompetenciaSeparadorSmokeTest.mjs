import assert from "node:assert/strict";

import {
    avaliarInssDctfweb,
} from "../src/features/certidao-mensal-documental/evaluators/avaliarInssDctfweb.js";

import {
    executarPreAvaliacaoDocumental,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentPreAssessment.js";

const empresa = {
    id:
        "11111111-1111-4111-8111-111111111111",
    nome:
        "R N TOPOGRAFIA E COMERCIO DE MATERIAL DE CONSTRUCAO CIVIL LTDA",
    cnpj:
        "06.052.599/0001-93",
};

function montarTextoDctfweb(
    linhaCompetencia
) {
    return `
MINISTERIO DA FAZENDA
SECRETARIA ESPECIAL DA RECEITA FEDERAL DO BRASIL
RECIBO DE ENTREGA DA DECLARACAO DE DEBITOS E CREDITOS TRIBUTARIOS FEDERAIS - DCTFWEB
DCTFWEB
CNPJ: 06.052.599/0001-93
NOME EMPRESARIAL: R N TOPOGRAFIA E COMERCIO DE MATERIAL DE CONSTRUCAO CIVIL LTDA
${linhaCompetencia}
DECLARACAO RETIFICADORA NAO
IDENTIFICACAO DA APURACAO DE DEBITOS 40510106186 / ESOCIAL
CONTRIBUICOES PREVIDENCIARIAS
`;
}

function contexto(
    competenciaEsperada =
        "04/2026"
) {
    return {
        documentoEsperado: {
            id:
                "inss-dctfweb",
            titulo:
                "INSS / DCTFWeb",
            competenciaEsperada,
        },
        empresaEsperada:
            empresa,
        dataReferencia:
            new Date(
                "2026-04-30T12:00:00.000Z"
            ),
    };
}

function avaliarDireto(
    linhaCompetencia,
    competenciaEsperada =
        "04/2026"
) {
    return avaliarInssDctfweb({
        textoExtraido:
            montarTextoDctfweb(
                linhaCompetencia
            ),
        ...contexto(
            competenciaEsperada
        ),
    });
}

function avaliarFluxoCompleto(
    linhaCompetencia,
    competenciaEsperada =
        "04/2026"
) {
    return executarPreAvaliacaoDocumental({
        textoExtraido:
            montarTextoDctfweb(
                linhaCompetencia
            ),
        ...contexto(
            competenciaEsperada
        ),
    });
}

const casosPositivos = [
    {
        nome:
            "espaco legado",
        linha:
            "PERIODO DE APURACAO 05/2026",
        esperado:
            "05/2026",
    },
    {
        nome:
            "pipe A3.2",
        linha:
            "PERIODO DE APURACAO|04/2026",
        esperado:
            "04/2026",
    },
    {
        nome:
            "pipe mais slash OCR real",
        linha:
            "PERIODO DE APURACAO|/04/2026",
        esperado:
            "04/2026",
    },
    {
        nome:
            "slash estrutural",
        linha:
            "PERIODO DE APURACAO/04/2026",
        esperado:
            "04/2026",
    },
    {
        nome:
            "dois pontos",
        linha:
            "PERIODO DE APURACAO: 04/2026",
        esperado:
            "04/2026",
    },
    {
        nome:
            "hifen",
        linha:
            "PERIODO DE APURACAO - 04/2026",
        esperado:
            "04/2026",
    },
    {
        nome:
            "competencia pipe slash",
        linha:
            "COMPETENCIA|/04/2026",
        esperado:
            "04/2026",
    },
];

for (
    const caso of
    casosPositivos
) {
    const direto =
        avaliarDireto(
            caso.linha,
            caso.esperado
        );

    assert.equal(
        direto.competenciaDocumento,
        caso.esperado,
        `${caso.nome}: evaluator direto não extraiu competência.`
    );

    assert.equal(
        direto.documentoIncompativel,
        false,
        `${caso.nome}: evaluator direto marcou incompatibilidade.`
    );

    assert.equal(
        direto.bloqueiaSubstituicao,
        false,
        `${caso.nome}: evaluator direto bloqueou competência válida.`
    );

    const completo =
        avaliarFluxoCompleto(
            caso.linha,
            caso.esperado
        );

    assert.equal(
        completo
            ?.avaliacao
            ?.competenciaDocumento,
        caso.esperado,
        `${caso.nome}: pré-avaliação completa não extraiu competência.`
    );

    assert.equal(
        completo
            ?.avaliacao
            ?.bloqueiaSubstituicao,
        false,
        `${caso.nome}: pré-avaliação completa bloqueou competência válida.`
    );
}

const casosNegativos = [
    {
        nome:
            "rotulo sem competencia",
        linha:
            "PERIODO DE APURACAO|/",
    },
    {
        nome:
            "mes invalido real",
        linha:
            "PERIODO DE APURACAO|/13/2026",
    },
    {
        nome:
            "slash duplicado",
        linha:
            "PERIODO DE APURACAO|//04/2026",
    },
    {
        nome:
            "pipe duplicado",
        linha:
            "PERIODO DE APURACAO||04/2026",
    },
    {
        nome:
            "mes solto sem rotulo",
        linha:
            "04/2026",
    },
];

for (
    const caso of
    casosNegativos
) {
    const direto =
        avaliarDireto(
            caso.linha,
            "04/2026"
        );

    assert.equal(
        direto.competenciaDocumento,
        "",
        `${caso.nome}: evaluator não pode inventar competência.`
    );

    assert.equal(
        direto.codigo,
        "COMPETENCIA_DOCUMENTAL_NAO_IDENTIFICADA",
        `${caso.nome}: evaluator deve permanecer fail-closed.`
    );

    assert.equal(
        direto.bloqueiaSubstituicao,
        true,
        `${caso.nome}: ausência de competência deve bloquear.`
    );

    const completo =
        avaliarFluxoCompleto(
            caso.linha,
            "04/2026"
        );

    assert.equal(
        completo
            ?.avaliacao
            ?.competenciaDocumento,
        "",
        `${caso.nome}: pré-avaliação não pode inventar competência.`
    );

    assert.equal(
        completo
            ?.avaliacao
            ?.bloqueiaSubstituicao,
        true,
        `${caso.nome}: pré-avaliação deve continuar fail-closed.`
    );
}

console.log(
    "CERT2_DCTFWEB_COMPETENCIA_SEPARATOR_SMOKE=PASS"
);

console.log(
    "OCR_REAL_PIPE_SLASH_04_2026=PASS"
);

console.log(
    "PREASSESSMENT_COMPLETO=PASS"
);

console.log(
    `CASOS_POSITIVOS=${casosPositivos.length}`
);

console.log(
    `CASOS_NEGATIVOS=${casosNegativos.length}`
);

console.log(
    "FAIL_CLOSED_NEGATIVOS=PASS"
);