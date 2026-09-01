import assert from "node:assert/strict";

import {
    readFileSync,
} from "node:fs";

import {
    adaptarResultadoCanonicoParaLaboratorio,
    diagnosticarCertidaoPdfCanonicoParaLaboratorio,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentCanonicalLaboratorioAdapter.js";

import {
    criarPayloadDocumentoCertidaoMensal,
    resultadoLaboratorioCertidaoPodeSerPersistido,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalPersistencePayloadService.js";

import {
    criarCertidaoMensalIndividualPersistenceService,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalIndividualPersistenceService.js";

const HASH =
    "a".repeat(
        64
    );

const EMPRESA_ID =
    "11111111-1111-4111-8111-111111111111";

const arquivoFixture = {
    name:
        "folha-pagamento.pdf",

    size:
        12345,

    type:
        "application/pdf",
};

const contextoFixture = {
    empresa: {
        id:
            EMPRESA_ID,

        nome:
            "EMPRESA TESTE LTDA",

        cnpj:
            "00.000.000/0001-00",
    },

    competencia:
        "2026-07-01",

    documento: {
        id:
            "folha-pagamento",

        titulo:
            "Folha de Pagamento",

        competenciaEsperada:
            "2026-07-01",
    },
};

function criarCanonico({
    competenciaArmazenamentoIso =
        "2026-06-01",
} = {}) {
    return {
        versaoContrato:
            "CERT2_DOCUMENTO_CANONICO_V1",

        status:
            "PRONTO",

        politica:
            "COMPETENCIA_MENSAL",

        leitura: {
            metodo:
                "camada_textual",

            texto:
                "FOLHA DE PAGAMENTO COMPETENCIA 06/2026",

            caracteres:
                40,

            paginas:
                2,

            paginasLidas:
                2,

            paginasProcessadas:
                [
                    1,
                    2,
                ],

            confianca:
                0.98,

            avisos:
                [],
        },

        classificacao: {
            id:
                "folha-pagamento",

            titulo:
                "Folha de Pagamento",

            variante:
                "",

            tipoClassificador:
                "folha-pagamento",

            tipoCatalogo:
                "folha-pagamento",

            confianca:
                0.99,

            complementar:
                false,
        },

        competencia: {
            valor:
                "06/2026",

            armazenamentoIso:
                competenciaArmazenamentoIso,

            fonte:
                "DOCUMENTO",

            confianca:
                0.99,
        },

        avaliacao: {
            codigo:
                "COMPETENCIA_DOCUMENTAL_REDIRECIONADA",

            nivel:
                "APROVADA",

            mensagens:
                [],

            documentoIncompativel:
                false,

            requerConferenciaHumana:
                false,
        },

        rastreabilidade: {
            hash:
                HASH,

            hashSha256:
                HASH,

            versaoMotor:
                "CERT2_DOCUMENTO_CANONICO_V1",

            estrategiaLeitura:
                "camada_textual",
        },

        validacaoArquivo: {
            mimeType:
                "application/pdf",

            tamanhoBytes:
                arquivoFixture.size,

            avisos:
                [],
        },

        erro:
            "",

        compatibilidade: {
            resolucaoLote: {
                tipoDocumento:
                    "folha-pagamento",

                tipoClassificador:
                    "folha-pagamento",

                titulo:
                    "Folha de Pagamento",

                confianca:
                    0.99,

                status:
                    "PRONTO",

                destino: {
                    competenciaIso:
                        competenciaArmazenamentoIso,

                    fonte:
                        "DOCUMENTO",
                },

                /*
                 * Valor propositalmente diferente.
                 *
                 * Se o payload executar a regra antiga uma segunda
                 * vez, acabará em 05/2026 e o teste falhará.
                 */
                avaliacao: {
                    codigo:
                        "COMPETENCIA_DOCUMENTAL_REDIRECIONADA",

                    nivel:
                        "APROVADA",

                    documentoIncompativel:
                        false,

                    bloqueiaSubstituicao:
                        false,

                    requerConferenciaHumana:
                        false,

                    requerConsultaOficial:
                        false,

                    dadosFolhaPagamento: {
                        competencia:
                            "05/2026",
                    },

                    documentoIdentificado:
                        "Folha de Pagamento",

                    regras:
                        [],
                },
            },
        },
    };
}

/*
 * ============================================================
 * 1 — PROVA ESTÁTICA DO HOOK
 * ============================================================
 */

const hookSource =
    readFileSync(
        new URL(
            "../src/features/certidao-mensal-documental/hooks/useCertidaoPdfLaboratorio.js",
            import.meta.url
        ),
        "utf8"
    );

const adapterSource =
    readFileSync(
        new URL(
            "../src/features/certidao-mensal-documental/analysis/certidaoDocumentCanonicalLaboratorioAdapter.js",
            import.meta.url
        ),
        "utf8"
    );

const individualSource =
    readFileSync(
        new URL(
            "../src/features/certidao-mensal-documental/services/certidaoMensalIndividualPersistenceService.js",
            import.meta.url
        ),
        "utf8"
    );

const batchHookSource =
    readFileSync(
        new URL(
            "../src/features/certidao-mensal-documental/hooks/useCertidaoMensalUploadMassa.js",
            import.meta.url
        ),
        "utf8"
    );

assert.doesNotMatch(
    hookSource,
    /diagnosticarCertidaoPdfLocal/,
    "O hook individual não pode continuar chamando o diagnóstico legado.",
);

assert.match(
    hookSource,
    /diagnosticarCertidaoPdfCanonicoParaLaboratorio/,
);

assert.match(
    hookSource,
    /salvarPdfCertidaoMensalIndividual/,
);

assert.doesNotMatch(
    batchHookSource,
    /salvarPdfCertidaoMensalIndividual|certidaoDocumentCanonicalLaboratorioAdapter/,
    "O fluxo em massa não pode ser costurado ao preflight exclusivo do individual.",
);

/*
 * O adaptador não pode esconder uma segunda inteligência documental.
 */
for (
    const proibido of
    [
        /validarArquivoCertidaoPdf/,
        /calcularHashSha256CertidaoPdf/,
        /extrairTextoCertidaoPdfLocal/,
        /executarPreAvaliacaoDocumental/,
        /processarArquivoCertidaoSingular/,
        /deveTentarOcrAdaptativoCert2/,
        /aceitarResolucaoOcrAdaptativoCert2/,
    ]
) {
    assert.doesNotMatch(
        adapterSource,
        proibido,
        "O adaptador deve somente consumir o resultado já produzido pelo motor canônico.",
    );
}

assert.match(
    adapterSource,
    /analisarDocumentoCert2/,
);

assert.match(
    adapterSource,
    /SAFE_SCAN_CERT2_M3_A5_GUARD_TIPO_SELECIONADO/,
);

assert.match(
    individualSource,
    /SAFE_SCAN_CERT2_M3_A5_PREFLIGHT_VIGENCIA_INDIVIDUAL/,
);

assert.doesNotMatch(
    individualSource,
    /PreflightComposto|criarCertidaoMensalUploadMassaPreflightComposto/,
    "O individual deve usar somente o reader de vigência, não duplicar o preflight composto do lote.",
);

/*
 * ============================================================
 * 2 — ADAPTADOR PRESERVA VERDADE CANÔNICA
 * ============================================================
 */

const canonico =
    criarCanonico();

const adaptado =
    adaptarResultadoCanonicoParaLaboratorio({
        canonico,
        arquivo:
            arquivoFixture,
        contexto:
            contextoFixture,
    });

assert.equal(
    adaptado
        ?.sucesso,
    true
);

assert.equal(
    adaptado
        ?.arquivo
        ?.hashSha256,
    HASH
);

assert.equal(
    adaptado
        ?.leitura
        ?.textoExtraido,
    canonico
        .leitura
        .texto
);

assert.equal(
    adaptado
        ?.preAvaliacaoDocumental
        ?.classificacao
        ?.id,
    "folha-pagamento"
);

assert.deepEqual(
    adaptado
        ?.preAvaliacaoDocumental
        ?.avaliacao,
    canonico
        .compatibilidade
        .resolucaoLote
        .avaliacao,
    "A avaliação RAW deve ser preservada quando o tipo esperado coincide.",
);

assert.equal(
    adaptado
        ?.motorDocumental
        ?.origem,
    "CANONICO_CERT2"
);

assert.equal(
    adaptado
        ?.motorDocumental
        ?.versao,
    "CERT2_DOCUMENTO_CANONICO_V1"
);

assert.equal(
    adaptado
        ?.motorDocumental
        ?.competenciaArmazenamentoIso,
    "2026-06-01"
);

/*
 * ============================================================
 * 3 — WRAPPER EXECUTA UMA ÚNICA ANÁLISE
 * ============================================================
 */

let chamadasMotor =
    0;

const wrapper =
    await diagnosticarCertidaoPdfCanonicoParaLaboratorio(
        arquivoFixture,
        {
            contexto:
                contextoFixture,

            analisarDocumento:
                async ({
                    contexto,
                }) => {
                    chamadasMotor +=
                        1;

                    assert.ok(
                        contexto
                            ?.dataReferencia instanceof
                            Date,
                        "O contexto legado deve ser convertido em data de referência para o motor canônico.",
                    );

                    assert.equal(
                        contexto
                            .dataReferencia
                            .toISOString()
                            .slice(
                                0,
                                10
                            ),
                        "2026-07-31",
                        "A referência documental da competência mensal deve preservar o último dia do mês, como no fluxo individual legado."
                    );

                    return canonico;
                },
        }
    );

assert.equal(
    chamadasMotor,
    1,
    "O fluxo individual deve executar exatamente uma análise canônica.",
);

assert.equal(
    wrapper
        ?.arquivo
        ?.hashSha256,
    HASH
);

/*
 * ============================================================
 * 4 — TIPO ERRADO CONTINUA BLOQUEADO SEM RECLASSIFICAÇÃO
 * ============================================================
 */

const adaptadoSlotErrado =
    adaptarResultadoCanonicoParaLaboratorio({
        canonico,
        arquivo:
            arquivoFixture,

        contexto: {
            ...contextoFixture,

            documento: {
                id:
                    "crf-fgts",

                titulo:
                    "CRF / FGTS",

                competenciaEsperada:
                    "2026-07-01",
            },
        },
    });

assert.equal(
    adaptadoSlotErrado
        ?.preAvaliacaoDocumental
        ?.avaliacao
        ?.codigo,
    "TIPO_DOCUMENTAL_DIVERGENTE"
);

assert.equal(
    adaptadoSlotErrado
        ?.preAvaliacaoDocumental
        ?.avaliacao
        ?.documentoIncompativel,
    true
);

assert.equal(
    resultadoLaboratorioCertidaoPodeSerPersistido(
        adaptadoSlotErrado
    ),
    false,
    "PDF classificado como outro tipo deve permanecer bloqueado no slot individual.",
);

/*
 * ============================================================
 * 5 — PAYLOAD USA COMPETÊNCIA CANÔNICA SEM SEGUNDA DECISÃO
 * ============================================================
 */

const payload =
    criarPayloadDocumentoCertidaoMensal({
        arquivo:
            arquivoFixture,

        resultado:
            adaptado,

        empresa:
            contextoFixture
                .empresa,

        documento:
            contextoFixture
                .documento,

        /*
         * Tela aberta em 07/2026.
         */
        competencia:
            "2026-07-01",
    });

assert.equal(
    payload
        ?.competencia,
    "2026-06-01",
    "A competência deve vir do motor canônico.",
);

assert.notEqual(
    payload
        ?.competencia,
    "2026-05-01",
    "A competência profunda do avaliador não pode ser resolvida novamente pelo payload.",
);

assert.notEqual(
    payload
        ?.competencia,
    "2026-07-01",
    "A competência aberta na interface não pode sobrescrever a competência canônica.",
);

/*
 * Competência canônica ausente = fail-closed.
 */
const canonicoSemCompetencia = {
    ...canonico,

    competencia: {
        ...canonico
            .competencia,

        armazenamentoIso:
            "",
    },
};

const adaptadoSemCompetencia =
    adaptarResultadoCanonicoParaLaboratorio({
        canonico:
            canonicoSemCompetencia,

        arquivo:
            arquivoFixture,

        contexto:
            contextoFixture,
    });

assert.throws(
    () =>
        criarPayloadDocumentoCertidaoMensal({
            arquivo:
                arquivoFixture,

            resultado:
                adaptadoSemCompetencia,

            empresa:
                contextoFixture
                    .empresa,

            documento:
                contextoFixture
                    .documento,

            competencia:
                "2026-07-01",
        }),
    /competência de armazenamento válida|competência canônica/i,
    "Origem canônica sem competência não pode fazer fallback para a tela ou regra antiga.",
);

/*
 * ============================================================
 * 6 — PREFLIGHT INDIVIDUAL: VIGÊNCIA BLOQUEADA
 * ============================================================
 */

{
    let chamadasSave =
        0;

    let chaveRecebida =
        null;

    const servico =
        criarCertidaoMensalIndividualPersistenceService({
            vigenciaReader: {
                async lerEstadoVigenciaPersistenciaPrincipalUploadMassa({
                    chaveLogica,
                }) {
                    chaveRecebida =
                        chaveLogica;

                    return {
                        versao:
                            1,

                        leituraConcluida:
                            true,

                        chaveLogica,

                        liberada:
                            false,

                        codigo:
                            "VIGENCIA_CONTRATUAL_BLOQUEADA",

                        mensagem:
                            "Competência anterior ao início do contrato.",
                    };
                },
            },

            salvarDocumento:
                async () => {
                    chamadasSave +=
                        1;

                    throw new Error(
                        "SAVE_NAO_DEVERIA_SER_CHAMADO"
                    );
                },
        });

    await assert.rejects(
        servico
            .salvarPdfCertidaoMensalIndividual({
                arquivo:
                    arquivoFixture,

                payload,
            }),
        /anterior ao início do contrato|vigência/i
    );

    assert.equal(
        chamadasSave,
        0,
        "Vigência bloqueada deve impedir qualquer delegação ao save/Storage.",
    );

    assert.deepEqual(
        chaveRecebida,
        {
            empresaId:
                EMPRESA_ID,

            competencia:
                "2026-06-01",

            tipoDocumento:
                "folha-pagamento",
        },
        "O preflight deve validar exatamente empresa + competência canônica + tipo documental.",
    );
}

/*
 * ============================================================
 * 7 — PREFLIGHT INDIVIDUAL: FALHA TÉCNICA
 * ============================================================
 */

{
    let chamadasSave =
        0;

    const servico =
        criarCertidaoMensalIndividualPersistenceService({
            vigenciaReader: {
                async lerEstadoVigenciaPersistenciaPrincipalUploadMassa() {
                    throw new Error(
                        "RPC_INCONCLUSIVA_FIXTURE"
                    );
                },
            },

            salvarDocumento:
                async () => {
                    chamadasSave +=
                        1;
                },
        });

    await assert.rejects(
        servico
            .salvarPdfCertidaoMensalIndividual({
                arquivo:
                    arquivoFixture,

                payload,
            }),
        /Não foi possível confirmar a vigência contratual/i
    );

    assert.equal(
        chamadasSave,
        0,
        "Falha técnica do reader também deve bloquear a fronteira de escrita.",
    );
}

/*
 * ============================================================
 * 8 — PREFLIGHT INDIVIDUAL: VIGÊNCIA LIBERADA
 * ============================================================
 */

{
    let chamadasSave =
        0;

    const servico =
        criarCertidaoMensalIndividualPersistenceService({
            vigenciaReader: {
                async lerEstadoVigenciaPersistenciaPrincipalUploadMassa({
                    chaveLogica,
                }) {
                    return {
                        versao:
                            1,

                        leituraConcluida:
                            true,

                        chaveLogica,

                        liberada:
                            true,

                        classificacao:
                            "DURANTE_DO_CONTRATO",

                        codigo:
                            "VIGENCIA_CONTRATUAL_OK",

                        mensagem:
                            "",
                    };
                },
            },

            salvarDocumento:
                async ({
                    arquivo,
                    payload,
                }) => {
                    chamadasSave +=
                        1;

                    return {
                        arquivo,
                        payload,
                        persistido:
                            true,
                    };
                },
        });

    const retorno =
        await servico
            .salvarPdfCertidaoMensalIndividual({
                arquivo:
                    arquivoFixture,

                payload,
            });

    assert.equal(
        chamadasSave,
        1,
        "Vigência liberada deve delegar exatamente uma vez ao save normal.",
    );

    assert.equal(
        retorno
            ?.persistido,
        true
    );
}

console.log("");
console.log("CERT2 — M3-A5-R3 — FLUXO INDIVIDUAL CANÔNICO APROVADO");
console.log("Motor canônico único: PASS");
console.log("Guard de tipo selecionado: PASS");
console.log("SHA/leitura/avaliação RAW: PASS");
console.log("Competência canônica sem segunda decisão: PASS");
console.log("Competência canônica ausente fail-closed: PASS");
console.log("Vigência bloqueada antes do save: PASS");
console.log("Falha técnica de vigência fail-closed: PASS");
console.log("Vigência liberada com uma única delegação: PASS");
console.log("Fluxo em massa sem costura ao preflight individual: PASS");
console.log("Supabase remoto / Storage remoto / Git write / deploy: ZERO");
