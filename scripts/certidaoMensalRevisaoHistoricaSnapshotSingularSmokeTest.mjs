import assert from "node:assert/strict";

import {
    readFileSync,
} from "node:fs";

import {
    resolverItemSingularRevisaoHistorica,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalUploadMassaService.js";

const HASH_A =
    "a".repeat(
        64
    );

const HASH_B =
    "b".repeat(
        64
    );

const singular = {
    indice:
        2,

    hash: {
        algoritmo:
            "SHA-256",

        sha256:
            HASH_A,
    },

    leitura: {
        textoExtraido:
            "VERDADE ANALITICA SINGULAR",
    },

    resolucao: {
        status:
            "PRONTO",

        empresa: {
            id:
                "empresa-documental",

            nome:
                "EMPRESA DOCUMENTAL",
        },

        destino: {
            competenciaIso:
                "2026-06-01",
        },

        tipoDocumento:
            "cnd-federal",

        avaliacao: {
            codigo:
                "AVALIACAO_SINGULAR",
        },
    },

    persistido:
        false,
};

const posLote = {
    ...singular,

    resolucao: {
        ...singular.resolucao,

        status:
            "IGNORADO",

        empresa: {
            id:
                "empresa-fallback",

            nome:
                "EMPRESA FALLBACK POS LOTE",
        },

        identificacaoColaborador: {
            status:
                "ASSOCIADO_PELO_LOTE",
        },
    },

    duplicidade: {
        codigo:
            "DUPLICADO_EXATO_HISTORICO",

        hashSha256:
            HASH_A,

        historico: {
            versaoId:
                "22222222-2222-4222-8222-222222222222",

            itemId:
                "33333333-3333-4333-8333-333333333333",

            numeroVersao:
                3,

            statusResultado:
                "CONFORME",
        },
    },
};

/*
 * ============================================================
 * 1. PROVA DINÂMICA — MATCH EXATO
 * ============================================================
 */

const encontrado =
    resolverItemSingularRevisaoHistorica({
        itensSingulares: [
            singular,
        ],

        itemAlvo:
            posLote,
    });

assert.strictEqual(
    encontrado,
    singular,
    "O resolver deve devolver exatamente o item singular original.",
);

assert.equal(
    encontrado
        ?.resolucao
        ?.empresa
        ?.id,
    "empresa-documental",
    "A empresa proposta pela política coletiva não pode contaminar o diagnóstico analítico.",
);

assert.equal(
    posLote
        ?.resolucao
        ?.empresa
        ?.id,
    "empresa-fallback",
    "A fixture pós-lote precisa permanecer diferente para validar a separação.",
);

/*
 * ============================================================
 * 2. FAIL-CLOSED — SNAPSHOT AUSENTE
 * ============================================================
 */

assert.throws(
    () =>
        resolverItemSingularRevisaoHistorica({
            itensSingulares:
                [],

            itemAlvo:
                posLote,
        }),
    /snapshot singular|forma única|bloqueada/i,
);

/*
 * ============================================================
 * 3. FAIL-CLOSED — MESMO ÍNDICE, SHA DIFERENTE
 * ============================================================
 */

assert.throws(
    () =>
        resolverItemSingularRevisaoHistorica({
            itensSingulares: [
                {
                    ...singular,

                    hash: {
                        ...singular.hash,

                        sha256:
                            HASH_B,
                    },
                },
            ],

            itemAlvo:
                posLote,
        }),
    /snapshot singular|forma única|bloqueada/i,
);

/*
 * ============================================================
 * 4. FAIL-CLOSED — MESMO SHA, ÍNDICE DIFERENTE
 * ============================================================
 */

assert.throws(
    () =>
        resolverItemSingularRevisaoHistorica({
            itensSingulares: [
                {
                    ...singular,

                    indice:
                        3,
                },
            ],

            itemAlvo:
                posLote,
        }),
    /snapshot singular|forma única|bloqueada/i,
);

/*
 * ============================================================
 * 5. FAIL-CLOSED — MATCH AMBÍGUO
 * ============================================================
 */

assert.throws(
    () =>
        resolverItemSingularRevisaoHistorica({
            itensSingulares: [
                singular,

                {
                    ...singular,
                },
            ],

            itemAlvo:
                posLote,
        }),
    /snapshot singular|forma única|bloqueada/i,
);

/*
 * ============================================================
 * 6. PROVA ESTÁTICA DO SERVIÇO E HOOK
 * ============================================================
 */

const uploadSource =
    readFileSync(
        new URL(
            "../src/features/certidao-mensal-documental/services/certidaoMensalUploadMassaService.js",
            import.meta.url
        ),
        "utf8"
    );

const hookSource =
    readFileSync(
        new URL(
            "../src/features/certidao-mensal-documental/hooks/useCertidaoMensalUploadMassa.js",
            import.meta.url
        ),
        "utf8"
    );

const helperStart =
    uploadSource.indexOf(
        "SAFE_SCAN_CERT2_M3_A7_RESOLVER_SNAPSHOT_SINGULAR"
    );

const singularMarker =
    uploadSource.indexOf(
        "SAFE_SCAN_CERT2_M3_A4_NUCLEO_SINGULAR",
        helperStart
    );

assert.ok(
    helperStart >= 0 &&
    singularMarker >
        helperStart,
    "Helper do snapshot deve ficar fora e antes do núcleo singular.",
);

const helperSource =
    uploadSource.slice(
        helperStart,
        singularMarker
    );

for (
    const forbidden of
    [
        /calcularHashSha256CertidaoPdf/,
        /calcularHash\s*\(/,
        /extrairTexto/,
        /resolverDocumento/,
        /enriquecerTexto/,
        /analisarDocumentoCert2/,
        /processarArquivoCertidaoSingular\s*\(/,
        /supabase/i,
        /\.rpc\s*\(/,
        /salvarPdf/,
    ]
) {
    assert.doesNotMatch(
        helperSource,
        forbidden,
        "Resolver do snapshot não pode executar nova inteligência documental nem escrita.",
    );
}

const snapshotIndex =
    uploadSource.indexOf(
        "SAFE_SCAN_CERT2_M3_A7_SNAPSHOT_SINGULAR"
    );

const collectiveIndex =
    uploadSource.indexOf(
        "const itensComGuardDuplicidade =",
        snapshotIndex
    );

assert.ok(
    snapshotIndex >= 0 &&
    collectiveIndex >
        snapshotIndex,
    "Snapshot singular deve existir antes da primeira política coletiva.",
);

assert.match(
    uploadSource,
    /return\s*\{[\s\S]{0,700}?itensSingulares,[\s\S]{0,500}?itens:\s*itensComFallbackColaborador,/,
    "O resultado do lote deve expor o snapshot e preservar o contrato pós-lote em itens.",
);

assert.match(
    hookSource,
    /resolverItemSingularRevisaoHistorica/,
);

assert.match(
    hookSource,
    /estado[\s\S]{0,120}?resultado[\s\S]{0,120}?itensSingulares/,
);

assert.match(
    hookSource,
    /criarDiagnosticoPersistencia\(\s*itemSingularAlvo\s*\)/,
    "O diagnóstico novo deve usar somente o snapshot singular.",
);

assert.doesNotMatch(
    hookSource,
    /criarDiagnosticoPersistencia\(\s*itemAlvo\s*\)/,
    "O item pós-lote não pode continuar sendo fonte do diagnóstico analítico.",
);

/*
 * Metadados históricos e optimistic guards continuam no item pós-lote.
 */
assert.match(
    hookSource,
    /const\s+historico\s*=\s*itemAlvo/,
);

assert.match(
    hookSource,
    /const\s+empresaId\s*=[\s\S]{0,250}?itemAlvo/,
);

assert.match(
    hookSource,
    /const\s+competenciaIso\s*=[\s\S]{0,300}?itemAlvo/,
);

assert.match(
    hookSource,
    /const\s+tipoDocumento\s*=[\s\S]{0,250}?itemAlvo/,
);

assert.match(
    hookSource,
    /const\s+hashSha256\s*=[\s\S]{0,350}?itemAlvo/,
);

/*
 * ============================================================
 * 7. REVISÃO NÃO GANHOU NOVA ANÁLISE OU NOVA RPC
 * ============================================================
 */

const revisionStart =
    hookSource.indexOf(
        "const salvarAnaliseCorrigidaDocumentoSalvo ="
    );

const revisionEnd =
    hookSource.indexOf(
        "const criarUrlDocumentoHistoricoReadOnly =",
        revisionStart
    );

assert.ok(
    revisionStart >= 0 &&
    revisionEnd >
        revisionStart,
);

const revisionSource =
    hookSource.slice(
        revisionStart,
        revisionEnd
    );

for (
    const forbidden of
    [
        /processarArquivosCertidaoEmLote\s*\(/,
        /processarArquivoCertidaoSingular\s*\(/,
        /analisarDocumentoCert2\s*\(/,
        /diagnosticarCertidaoPdfLocal\s*\(/,
        /executarPreAvaliacaoDocumental\s*\(/,
        /calcularHashSha256CertidaoPdf\s*\(/,
        /enriquecerTextoCertidaoPorOcrAdaptativo\s*\(/,
    ]
) {
    assert.doesNotMatch(
        revisionSource,
        forbidden,
        "A revisão não pode executar nova análise documental.",
    );
}

const rpcMatches =
    revisionSource.match(
        /revisar_certidao_mensal_versao_existente/g
    ) ||
    [];

assert.equal(
    rpcMatches.length,
    1,
    "O M3-A7 não pode adicionar outra RPC de revisão.",
);

console.log("");
console.log("CERT2 — M3-A7-R4 — SNAPSHOT SINGULAR DA REVISÃO APROVADO");
console.log("SNAPSHOT_ANTES_POLITICA_COLETIVA=PASS");
console.log("PAREAMENTO_INDICE_SHA256=PASS");
console.log("MATCH_UNICO=PASS");
console.log("SNAPSHOT_AUSENTE_FAIL_CLOSED=PASS");
console.log("INDICE_DIVERGENTE_FAIL_CLOSED=PASS");
console.log("SHA_DIVERGENTE_FAIL_CLOSED=PASS");
console.log("AMBIGUIDADE_FAIL_CLOSED=PASS");
console.log("DIAGNOSTICO_ANALITICO_USA_SINGULAR=PASS");
console.log("METADADOS_HISTORICOS_USAM_POS_LOTE=PASS");
console.log("REANALISE_ADICIONAL=ZERO");
console.log("OCR_ADICIONAL=ZERO");
console.log("SHA_ADICIONAL=ZERO");
console.log("RPC_ADICIONAL=ZERO");
console.log("SUPABASE_WRITE=ZERO");
