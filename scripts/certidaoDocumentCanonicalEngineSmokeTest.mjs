import assert from "node:assert/strict";

import {
    resolverDocumentoCertidaoEmLote,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentBatchResolver.js";

import {
    analisarDocumentoCert2,
    analisarTextoDocumentoCert2,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentCanonicalEngine.js";

import {
    CERT2_DOCUMENTO_CANONICO_VERSAO,
    validarResultadoDocumentoCanonicoCert2,
} from "../src/features/certidao-mensal-documental/domain/certidaoDocumentCanonicalContract.js";

const EMPRESA = Object.freeze({
    id:
        "11111111-1111-4111-8111-111111111111",
    nome:
        "RIBEIRO AQUINO ENGENHARIA LTDA",
    cnpj:
        "13.697.181/0001-07",
});

const DATA_REFERENCIA =
    new Date(
        "2026-03-31T12:00:00.000Z"
    );

const HASH_FIXTURE =
    "a".repeat(
        64
    );

const TEXTO_DCTFWEB = `
RECIBO DE ENTREGA DA DCTFWEB
DECLARAÇÃO DE DÉBITOS E CRÉDITOS TRIBUTÁRIOS FEDERAIS PREVIDENCIÁRIOS
CNPJ: 13.697.181/0001-07
NOME EMPRESARIAL: RIBEIRO AQUINO ENGENHARIA LTDA
PERÍODO DE APURAÇÃO: 07/2026
DATA DE TRANSMISSÃO: 10/08/2026
NÚMERO DO RECIBO: 123456789
`;

const TEXTO_CND_MUNICIPAL = `
PREFEITURA MUNICIPAL DE SÃO JOSÉ DOS CAMPOS
SECRETARIA MUNICIPAL DA FAZENDA
CERTIDÃO NEGATIVA DE DÉBITOS MUNICIPAIS
RAZÃO SOCIAL: RIBEIRO AQUINO ENGENHARIA LTDA
CNPJ: 13.697.181/0001-07
EMISSÃO: 15/01/2026
VALIDADE: 30/06/2026
`;

const TEXTO_CND_ESTADUAL = `
SECRETARIA DA FAZENDA E PLANEJAMENTO DO ESTADO DE SÃO PAULO
CERTIDÃO NEGATIVA DE DÉBITOS TRIBUTÁRIOS
NÃO INSCRITOS NA DÍVIDA ATIVA DO ESTADO DE SÃO PAULO
RAZÃO SOCIAL: RIBEIRO AQUINO ENGENHARIA LTDA
CNPJ: 13.697.181/0001-07
DATA DE EMISSÃO: 05/01/2026
VALIDADE: 30/06/2026
CÓDIGO DE CONTROLE: ABCD-1234-EFGH
`;

const TEXTO_CRF_LAYOUT_VARIAVEL = `
CERTIFICADO DE REGULARIDADE DO FGTS - CRF
Empregador: RIBEIRO AQUINO ENGENHARIA LTDA
Inscrição 13.697.181/0001-07
Validade: 15/03/2026 a 13/04/2026
Certificação Número: 20260315011913697181000107
Consulta oficial disponível nos canais da CAIXA.
`;

const CONTEXTO = Object.freeze({
    empresas: [
        EMPRESA,
    ],
    dataReferencia:
        DATA_REFERENCIA,
});

function resolverDiretamente(
    textoExtraido
) {
    return resolverDocumentoCertidaoEmLote({
        textoExtraido,
        empresas: [
            EMPRESA,
        ],
        dataReferencia:
            DATA_REFERENCIA,
    });
}

function analisarTexto(
    textoExtraido
) {
    return analisarTextoDocumentoCert2({
        textoExtraido,
        contexto:
            CONTEXTO,
        hash:
            HASH_FIXTURE,
    });
}

function verificarInvariantes(
    canonico
) {
    assert.equal(
        canonico.versaoContrato,
        CERT2_DOCUMENTO_CANONICO_VERSAO
    );

    assert.deepEqual(
        validarResultadoDocumentoCanonicoCert2(
            canonico
        ),
        {
            valido:
                true,
            erros: [],
        }
    );

    assert.equal(
        canonico
            .seguranca
            .somenteAnalise,
        true
    );

    assert.equal(
        canonico
            .seguranca
            .persistenciaAutorizada,
        false
    );

    assert.equal(
        canonico
            .avaliacao
            .bloqueiaPersistencia,
        true
    );

    assert.equal(
        canonico
            .persistenciaAutomatica,
        false
    );

    assert.equal(
        canonico
            .persistido,
        false
    );

    assert.equal(
        canonico
            .rastreabilidade
            .hashSha256,
        HASH_FIXTURE
    );

    assert.equal(
        canonico
            .rastreabilidade
            .hash,
        HASH_FIXTURE
    );
}

function verificarEquivalencia({
    textoExtraido,
    tipo,
    competencia = "",
    armazenamentoIso,
    emissao = "",
    validadeFim = "",
    codigoAvaliacao,
}) {
    const direto =
        resolverDiretamente(
            textoExtraido
        );

    const canonico =
        analisarTexto(
            textoExtraido
        );

    verificarInvariantes(
        canonico
    );

    assert.equal(
        canonico
            .classificacao
            .id,
        direto.tipoDocumento
    );

    assert.equal(
        canonico
            .classificacao
            .id,
        tipo
    );

    assert.equal(
        canonico
            .classificacao
            .confianca,
        direto.confianca
    );

    assert.equal(
        canonico
            .empresa
            .status,
        direto
            .empresa
            .status
    );

    assert.equal(
        canonico
            .empresa
            .empresaId,
        direto
            .empresa
            .id
    );

    assert.equal(
        canonico
            .empresa
            .cnpjEncontrado,
        direto
            .empresa
            .cnpjCorrespondente
    );

    assert.equal(
        canonico
            .competencia
            .valor,
        competencia
    );

    assert.equal(
        canonico
            .competencia
            .armazenamentoIso,
        armazenamentoIso
    );

    assert.equal(
        canonico
            .temporal
            .emissao,
        emissao
    );

    assert.equal(
        canonico
            .temporal
            .validadeFim,
        validadeFim
    );

    assert.equal(
        canonico
            .temporal
            .validade,
        validadeFim
    );

    assert.equal(
        canonico
            .avaliacao
            .codigo,
        direto
            .avaliacao
            .codigo
    );

    assert.equal(
        canonico
            .avaliacao
            .codigo,
        codigoAvaliacao
    );

    assert.deepEqual(
        canonico
            .compatibilidade
            .resolucaoLote,
        direto
    );

    const repeticao =
        analisarTexto(
            textoExtraido
        );

    assert.deepEqual(
        repeticao,
        canonico,
        `O contrato canônico deve ser determinístico para ${tipo}.`
    );

    return canonico;
}

const dctfweb =
    verificarEquivalencia({
        textoExtraido:
            TEXTO_DCTFWEB,
        tipo:
            "inss-dctfweb",
        competencia:
            "07/2026",
        armazenamentoIso:
            "2026-07-01",
        codigoAvaliacao:
            "COMPETENCIA_DOCUMENTAL_REDIRECIONADA",
    });

assert.equal(
    dctfweb
        .classificacao
        .variante,
    "Recibo de Entrega da DCTFWeb"
);

assert.equal(
    dctfweb
        .classificacao
        .id,
    "inss-dctfweb",
    "A variante não pode substituir a família canônica."
);

verificarEquivalencia({
    textoExtraido:
        TEXTO_CND_MUNICIPAL,
    tipo:
        "cnd-municipal",
    armazenamentoIso:
        "2026-01-01",
    emissao:
        "2026-01-15",
    validadeFim:
        "2026-06-30",
    codigoAvaliacao:
        "COMPATIVEL_CONSULTA_OFICIAL",
});

verificarEquivalencia({
    textoExtraido:
        TEXTO_CND_ESTADUAL,
    tipo:
        "cnd-estadual",
    armazenamentoIso:
        "2026-01-01",
    emissao:
        "2026-01-05",
    validadeFim:
        "2026-06-30",
    codigoAvaliacao:
        "COMPATIVEL_CONSULTA_OFICIAL",
});

const crf =
    verificarEquivalencia({
        textoExtraido:
            TEXTO_CRF_LAYOUT_VARIAVEL,
        tipo:
            "crf-fgts",
        armazenamentoIso:
            "2026-03-01",
        emissao:
            "2026-03-15",
        validadeFim:
            "2026-04-13",
        codigoAvaliacao:
            "COMPATIVEL_VALIDACAO_CAIXA",
    });

assert.deepEqual(
    crf
        .classificacao
        .evidencias,
    [
        "IDENTIDADE_ESTRUTURAL_CRF_FGTS",
        "CNPJ_DOCUMENTAL",
        "INTERVALO_VALIDADE",
        "NUMERO_CERTIFICACAO",
        "EVIDENCIA_INSTITUCIONAL",
    ]
);

const falsaMencaoCrf =
    analisarTexto(`
        CHECKLIST DE DOCUMENTOS MENSAIS
        CRF - FGTS
        CNPJ: 13.697.181/0001-07
        VALIDADE: 15/03/2026 A 13/04/2026
    `);

assert.equal(
    falsaMencaoCrf.status,
    "BLOQUEADO"
);

assert.equal(
    falsaMencaoCrf
        .classificacao
        .id,
    "nao-identificado"
);

const desconhecido =
    analisarTexto(
        "Conteúdo sem identidade documental comprovável."
    );

assert.equal(
    desconhecido.status,
    "BLOQUEADO"
);

assert.equal(
    desconhecido
        .classificacao
        .id,
    "nao-identificado"
);

assert.equal(
    desconhecido
        .avaliacao
        .bloqueiaPersistencia,
    true
);

const chamadas = [];

const arquivoComNomeEnganoso = {
    name:
        "CND Municipal - nome nao confiavel.pdf",
    type:
        "application/pdf",
    size:
        1024,
};

const porArquivo =
    await analisarDocumentoCert2({
        arquivo:
            arquivoComNomeEnganoso,

        contexto:
            CONTEXTO,

        dependencias: {
            validarArquivo:
                async () => {
                    chamadas.push(
                        "validar"
                    );

                    return {
                        valido:
                            true,
                        nomeOriginal:
                            arquivoComNomeEnganoso
                                .name,
                        mimeType:
                            arquivoComNomeEnganoso
                                .type,
                        tamanhoBytes:
                            arquivoComNomeEnganoso
                                .size,
                        avisos: [],
                    };
                },

            calcularHash:
                async () => {
                    chamadas.push(
                        "hash"
                    );

                    return {
                        algoritmo:
                            "SHA-256",
                        hashSha256:
                            HASH_FIXTURE,
                    };
                },

            extrairTexto:
                async () => {
                    chamadas.push(
                        "leitura"
                    );

                    return {
                        sucesso:
                            true,
                        executado:
                            true,
                        metodo:
                            "fixture_textual",
                        tipoLeitura:
                            "fixture_textual",
                        textoExtraido:
                            TEXTO_DCTFWEB,
                        quantidadeCaracteres:
                            TEXTO_DCTFWEB
                                .trim()
                                .length,
                        paginasLidas:
                            1,
                        totalPaginas:
                            1,
                        confianca:
                            100,
                        avisos: [],
                    };
                },

            resolverDocumento:
                (entrada) => {
                    chamadas.push(
                        "resolver"
                    );

                    return resolverDocumentoCertidaoEmLote(
                        entrada
                    );
                },

            enriquecerTextoOcrAdaptativo:
                async () => ({
                    aplicada:
                        false,
                    texto:
                        TEXTO_DCTFWEB,
                    avisos: [],
                }),
        },
    });

assert.deepEqual(
    chamadas,
    [
        "validar",
        "hash",
        "leitura",
        "resolver",
    ]
);

assert.equal(
    porArquivo
        .classificacao
        .id,
    "inss-dctfweb",
    "O nome do arquivo não pode decidir a classificação."
);

assert.equal(
    porArquivo
        .classificacao
        .variante,
    "Recibo de Entrega da DCTFWeb"
);

assert.equal(
    porArquivo
        .rastreabilidade
        .hashSha256,
    HASH_FIXTURE
);

assert.equal(
    porArquivo
        .leitura
        .paginas,
    1
);

assert.equal(
    porArquivo
        .persistenciaAutomatica,
    false
);

await assert.rejects(
    () =>
        analisarDocumentoCert2(),
    /Nenhum arquivo foi informado/
);

await assert.rejects(
    () =>
        analisarDocumentoCert2({
            arquivo:
                arquivoComNomeEnganoso,

            contexto:
                CONTEXTO,

            dependencias: {
                validarArquivo:
                    async () => ({
                        valido:
                            true,
                        nomeOriginal:
                            arquivoComNomeEnganoso
                                .name,
                        mimeType:
                            arquivoComNomeEnganoso
                                .type,
                        tamanhoBytes:
                            arquivoComNomeEnganoso
                                .size,
                        avisos: [],
                    }),

                calcularHash:
                    async () => ({
                        algoritmo:
                            "SHA-256",
                        hashSha256:
                            "hash-invalido",
                    }),

                extrairTexto:
                    async () => ({
                        sucesso:
                            true,
                        executado:
                            true,
                        metodo:
                            "fixture_textual",
                        textoExtraido:
                            TEXTO_CND_MUNICIPAL,
                        quantidadeCaracteres:
                            TEXTO_CND_MUNICIPAL
                                .trim()
                                .length,
                        paginasLidas:
                            1,
                        totalPaginas:
                            1,
                        confianca:
                            100,
                        avisos: [],
                    }),

                resolverDocumento:
                    resolverDocumentoCertidaoEmLote,
            },
        }),
    /não recebeu um SHA-256 válido/
);

console.log(
    "certidaoDocumentCanonicalEngineSmokeTest: OK"
);
