import assert from "node:assert/strict";

import {
    readFileSync,
} from "node:fs";

import {
    processarArquivoCertidaoSingular,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalUploadMassaService.js";

import {
    analisarDocumentoCert2,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentCanonicalEngine.js";

const HASH_FIXTURE =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const arquivoFixture = {
    name:
        "M3-A4-FIXTURE.pdf",

    size:
        321,

    type:
        "application/pdf",

    webkitRelativePath:
        "",
};

function criarResolucaoFixture() {
    return {
        status:
            "PRONTO",

        classificacao: {
            identificado:
                true,

            id:
                "cnd-federal",

            titulo:
                "CND Federal",

            tipoCatalogo:
                "cnd-federal",

            confianca:
                95,

            evidencias: [
                "FIXTURE_M3_A4",
            ],
        },

        identificacaoEmpresa: {
            status:
                "IDENTIFICADA",

            empresaId:
                "empresa-fixture",

            cnpjEncontrado:
                "12345678000199",

            metodoIdentificacao:
                "CNPJ",

            empresa: {
                id:
                    "empresa-fixture",

                razaoSocial:
                    "EMPRESA FIXTURE",

                nomeFantasia:
                    "EMPRESA FIXTURE",

                cnpj:
                    "12345678000199",
            },
        },

        politica:
            "VALIDADE",

        destino: {
            competenciaIso:
                "2026-08-01",

            fonte:
                "DATA_EMISSAO",

            dataFonteIso:
                "2026-08-01",
        },

        avaliacao: {
            codigo:
                "DOCUMENTO_VALIDO",

            nivel:
                "CONFORME",

            mensagem:
                "Fixture M3-A4.",

            documentoIncompativel:
                false,

            bloqueiaSubstituicao:
                false,

            dadosTemporais: {
                dataEmissaoIso:
                    "2026-08-01",

                dataValidadeIso:
                    "2027-02-01",
            },
        },

        motivos:
            [],

        analiseSemantica:
            {},

        prontoParaRevisao:
            true,

        persistenciaAutomatica:
            false,

        persistido:
            false,
    };
}

function criarDependencias(
    contadores
) {
    return {
        validarArquivo:
            async () => {
                contadores.validar +=
                    1;

                return {
                    valido:
                        true,

                    tamanhoBytes:
                        321,

                    mimeType:
                        "application/pdf",
                };
            },

        calcularHash:
            async () => {
                contadores.hash +=
                    1;

                return {
                    algoritmo:
                        "SHA-256",

                    hashSha256:
                        HASH_FIXTURE,
                };
            },

        extrairTexto:
            async () => {
                contadores.leitura +=
                    1;

                const texto =
                    "CERTIDAO FEDERAL EMPRESA FIXTURE CNPJ 12.345.678/0001-99";

                return {
                    metodo:
                        "PDF_TEXT",

                    tipoLeitura:
                        "PDF_TEXT",

                    textoExtraido:
                        texto,

                    quantidadeCaracteres:
                        texto.length,

                    qualidadeTexto: {
                        prontoParaClassificacao:
                            true,
                    },
                };
            },

        resolverDocumento:
            () => {
                contadores.resolver +=
                    1;

                return criarResolucaoFixture();
            },

        enriquecerTextoOcrAdaptativo:
            async () => {
                contadores.ocr +=
                    1;

                return {
                    aplicada:
                        false,

                    texto:
                        "",

                    textoOcr:
                        "",

                    paginasOcr:
                        [],

                    totalPaginas:
                        0,

                    confiancaOcr:
                        null,

                    avisos:
                        [],
                };
            },
    };
}

const serviceSource =
    readFileSync(
        new URL(
            "../src/features/certidao-mensal-documental/services/certidaoMensalUploadMassaService.js",
            import.meta.url
        ),
        "utf8"
    );

const engineSource =
    readFileSync(
        new URL(
            "../src/features/certidao-mensal-documental/analysis/certidaoDocumentCanonicalEngine.js",
            import.meta.url
        ),
        "utf8"
    );

/*
 * ============================================================
 * PROVA ESTÁTICA — FRONTEIRA
 * ============================================================
 */

const singularMarkerStart =
    serviceSource.indexOf(
        "SAFE_SCAN_CERT2_M3_A4_NUCLEO_SINGULAR"
    );

const singularStart =
    serviceSource.indexOf(
        "export async function processarArquivoCertidaoSingular({"
    );

const batchStart =
    serviceSource.indexOf(
        "export async function processarArquivosCertidaoEmLote({"
    );

assert.ok(
    singularMarkerStart >= 0,
    "O marcador rastreável do núcleo singular precisa existir.",
);

assert.ok(
    singularStart >
        singularMarkerStart,
    "O marcador do núcleo singular deve anteceder o export da função.",
);

assert.ok(
    batchStart >
        singularStart,
    "O núcleo singular deve existir antes do orquestrador do lote.",
);

const singularSource =
    serviceSource.slice(
        singularMarkerStart,
        batchStart
    );

assert.match(
    singularSource,
    /SAFE_SCAN_CERT2_M3_A4_NUCLEO_SINGULAR/,
);

assert.match(
    singularSource,
    /await deps\.validarArquivo\(/,
);

assert.match(
    singularSource,
    /await deps\.calcularHash\(/,
);

assert.match(
    singularSource,
    /await deps\.extrairTexto\(/,
);

assert.match(
    singularSource,
    /deps\.resolverDocumento\(\{/,
);

assert.match(
    singularSource,
    /deveTentarOcrAdaptativoCert2\(\{/,
);

assert.match(
    singularSource,
    /aceitarResolucaoOcrAdaptativoCert2\(\{/,
);

assert.doesNotMatch(
    singularSource,
    /supabase|salvarPdfCertidaoMensal|\.upload\(/i,
    "O núcleo singular não pode escrever em banco ou Storage.",
);

const batchSource =
    serviceSource.slice(
        batchStart
    );

const chamadaSingularNoBatch =
    batchSource.indexOf(
        "await processarArquivoCertidaoSingular({"
    );

const inicioColetivo =
    batchSource.indexOf(
        "const itensComGuardDuplicidade"
    );

assert.ok(
    chamadaSingularNoBatch >= 0,
    "O lote deve consumir o núcleo singular.",
);

assert.ok(
    inicioColetivo >
        chamadaSingularNoBatch,
    "A orquestração coletiva deve começar depois da análise singular.",
);

const batchAntesColetivo =
    batchSource.slice(
        0,
        inicioColetivo
    );

assert.doesNotMatch(
    batchAntesColetivo,
    /await deps\.validarArquivo\(/,
    "O lote não deve manter validação documental paralela.",
);

assert.doesNotMatch(
    batchAntesColetivo,
    /await deps\.calcularHash\(/,
    "O lote não deve manter cálculo de hash paralelo.",
);

assert.doesNotMatch(
    batchAntesColetivo,
    /await deps\.extrairTexto\(/,
    "O lote não deve manter leitura documental paralela.",
);

for (
    const marcador of
    [
        "aplicarGuardDuplicidadeExataIntralote(",
        "associarComplementaresFolhaIntralote(",
        "criarMapaIdentidadesColaboradorLote({",
        "aplicarGuardEmpresaNaoCadastradaLote(",
        "aplicarGuardDivergenciaEmpresaColaboradorLote({",
        "aplicarFallbackColaboradorLote({",
    ]
) {
    assert.ok(
        batchSource
            .slice(
                inicioColetivo
            )
            .includes(
                marcador
            ),
        "Orquestração coletiva preservada: " +
            marcador,
    );
}

assert.match(
    engineSource,
    /SAFE_SCAN_CERT2_M3_A4_ENGINE_SINGULAR/,
);

assert.match(
    engineSource,
    /await processarArquivoCertidaoSingular\(\{/,
);

assert.doesNotMatch(
    engineSource,
    /processarArquivosCertidaoEmLote/,
    "O motor canônico não pode depender do orquestrador completo do lote.",
);

/*
 * ============================================================
 * PROVA DINÂMICA — NÚCLEO SINGULAR
 * ============================================================
 */

{
    const contadores = {
        validar:
            0,

        hash:
            0,

        leitura:
            0,

        resolver:
            0,

        ocr:
            0,
    };

    const item =
        await processarArquivoCertidaoSingular({
            arquivo:
                arquivoFixture,

            empresas:
                [],

            dataReferencia:
                new Date(
                    "2026-08-31T12:00:00.000Z"
                ),

            dependencias:
                criarDependencias(
                    contadores
                ),
        });

    assert.equal(
        item?.hash?.sha256,
        HASH_FIXTURE,
    );

    assert.equal(
        item?.resolucao?.status,
        "PRONTO",
    );

    assert.equal(
        item?.persistido,
        false,
    );

    assert.equal(
        contadores.validar,
        1,
    );

    assert.equal(
        contadores.hash,
        1,
    );

    assert.equal(
        contadores.leitura,
        1,
    );

    assert.equal(
        contadores.resolver,
        1,
        "Sem OCR candidato, a resolução documental deve ocorrer uma única vez.",
    );
}

/*
 * ============================================================
 * PROVA DINÂMICA — MOTOR CANÔNICO DIRETO
 * ============================================================
 */

{
    const contadores = {
        validar:
            0,

        hash:
            0,

        leitura:
            0,

        resolver:
            0,

        ocr:
            0,
    };

    const resultado =
        await analisarDocumentoCert2({
            arquivo:
                arquivoFixture,

            contexto: {
                empresas:
                    [],

                dataReferencia:
                    new Date(
                        "2026-08-31T12:00:00.000Z"
                    ),
            },

            dependencias:
                criarDependencias(
                    contadores
                ),
        });

    assert.equal(
        resultado
            ?.rastreabilidade
            ?.hashSha256,
        HASH_FIXTURE,
        "O motor canônico deve receber o SHA-256 produzido pelo núcleo singular.",
    );

    assert.equal(
        resultado
            ?.compatibilidade
            ?.resolucaoLote
            ?.status,
        "PRONTO",
        "A resolução singular deve chegar intacta ao contrato canônico.",
    );

    assert.equal(
        contadores.validar,
        1,
    );

    assert.equal(
        contadores.hash,
        1,
    );

    assert.equal(
        contadores.leitura,
        1,
    );

    assert.equal(
        contadores.resolver,
        1,
        "O motor canônico deve executar somente uma resolução na fixture sem OCR candidato.",
    );
}

/*
 * ============================================================
 * FAIL-CLOSED — ERRO ANALÍTICO
 * ============================================================
 */

{
    const contadores = {
        validar:
            0,

        hash:
            0,

        leitura:
            0,

        resolver:
            0,

        ocr:
            0,
    };

    const deps =
        criarDependencias(
            contadores
        );

    deps.resolverDocumento =
        () => {
            throw new Error(
                "FALHA_ANALITICA_FIXTURE_M3_A4"
            );
        };

    const itemFalha =
        await processarArquivoCertidaoSingular({
            arquivo:
                arquivoFixture,

            dependencias:
                deps,
        });

    assert.match(
        itemFalha?.erro || "",
        /FALHA_ANALITICA_FIXTURE_M3_A4/,
        "Falha analítica deve permanecer explícita.",
    );

    assert.equal(
        itemFalha?.persistido,
        false,
        "Falha singular jamais pode sinalizar persistência.",
    );
}

/*
 * ============================================================
 * CANCELAMENTO — NÃO CONVERTER ABORT EM ITEM COMUM
 * ============================================================
 */

{
    const contadores = {
        validar:
            0,

        hash:
            0,

        leitura:
            0,

        resolver:
            0,

        ocr:
            0,
    };

    const deps =
        criarDependencias(
            contadores
        );

    const abortError =
        new Error(
            "ABORT_FIXTURE_M3_A4"
        );

    abortError.name =
        "AbortError";

    deps.extrairTexto =
        async () => {
            throw abortError;
        };

    await assert.rejects(
        processarArquivoCertidaoSingular({
            arquivo:
                arquivoFixture,

            dependencias:
                deps,
        }),
        (error) =>
            error ===
            abortError,
        "AbortError deve continuar propagando e não pode ser convertido em falha comum.",
    );
}

console.log(
    "M3-A4_SMOKE=PASS"
);

console.log(
    "NUCLEO_SINGULAR=PASS"
);

console.log(
    "ENGINE_CANONICO_DIRETO=PASS"
);

console.log(
    "ORQUESTRACAO_LOTE_PRESERVADA=PASS"
);

console.log(
    "SHA_PRESERVADO=PASS"
);

console.log(
    "OCR_ADAPTATIVO_ESTRUTURA=PRESERVADA"
);

console.log(
    "FAIL_CLOSED=PASS"
);

console.log(
    "CANCELAMENTO=PASS"
);

console.log(
    "PERSISTENCIA_NO_NUCLEO=ZERO"
);
