import assert from "node:assert/strict";

import {
    readFileSync,
} from "node:fs";

import {
    join,
} from "node:path";

import {
    criarCertidaoMensalUploadMassaPreflightComposto,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalUploadMassaPreflightCompostoService.js";

import {
    criarCertidaoMensalUploadMassaPreflightVigenciaReader,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalUploadMassaPreflightVigenciaReaderService.js";

import {
    executarPlanoPersistenciaPrincipalUploadMassa,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalUploadMassaPersistencePlanService.js";

const EMPRESA_ID =
    "11111111-1111-4111-8111-111111111111";

const COMPETENCIA =
    "2026-01-01";

const TIPO_DOCUMENTO =
    "cnd-federal";

const HASH =
    "a".repeat(
        64
    );

const CHAVE_LOGICA =
    Object.freeze({
        empresaId:
            EMPRESA_ID,

        competencia:
            COMPETENCIA,

        tipoDocumento:
            TIPO_DOCUMENTO,
    });

const PREFLIGHT =
    Object.freeze({
        versao:
            1,

        expectativa:
            "ITEM_AUSENTE",

        chaveLogica:
            CHAVE_LOGICA,

        documentoAtual:
            null,
    });

function criarCenario(
    respostaRpc
) {
    const eventos =
        [];

    const chamadasRpc =
        [];

    const clienteSupabase = {
        rpc(
            nome,
            parametros
        ) {
            eventos.push(
                "vigencia"
            );

            chamadasRpc.push({
                nome,
                parametros,
            });

            return Promise.resolve(
                respostaRpc
            );
        },
    };

    const vigenciaReader =
        criarCertidaoMensalUploadMassaPreflightVigenciaReader({
            clienteSupabase,
        });

    const slotReader = {
        async lerEstadoRemotoPersistenciaPrincipalUploadMassa({
            chaveLogica,
        } = {}) {
            eventos.push(
                "slot"
            );

            assert.deepEqual(
                chaveLogica,
                CHAVE_LOGICA
            );

            return Object.freeze({
                versao:
                    1,

                leituraConcluida:
                    true,

                chaveLogica:
                    CHAVE_LOGICA,

                slotExiste:
                    false,

                documentoAtual:
                    null,
            });
        },
    };

    const hashReader = {
        async lerEstadoShaPersistenciaPrincipalUploadMassa({
            hashSha256,
        } = {}) {
            eventos.push(
                "hash"
            );

            assert.equal(
                hashSha256,
                HASH
            );

            return Object.freeze({
                versao:
                    1,

                leituraConcluida:
                    true,

                hashSha256:
                    HASH,

                jaExiste:
                    false,

                ocorrencias:
                    Object.freeze([]),
            });
        },
    };

    const composto =
        criarCertidaoMensalUploadMassaPreflightComposto({
            vigenciaReader,
            slotReader,
            hashReader,
        });

    return {
        eventos,
        chamadasRpc,
        composto,
    };
}

/*
 * ============================================================
 * 1 — DURANTE DO CONTRATO
 * vigência -> slot -> SHA -> autorizado
 * ============================================================
 */

{
    const cenario =
        criarCenario({
            data:
                "DURANTE_DO_CONTRATO",

            error:
                null,
        });

    const resultado =
        await cenario
            .composto
            .validarAlvoPersistenciaPrincipalUploadMassa({
                preflight:
                    PREFLIGHT,

                hashSha256:
                    HASH,
            });

    assert.equal(
        resultado?.podeExecutar,
        true
    );

    assert.equal(
        resultado?.codigo,
        "PREFLIGHT_COMPOSTO_OK"
    );

    assert.equal(
        resultado
            ?.resultadoVigencia
            ?.liberada,
        true
    );

    assert.equal(
        resultado
            ?.resultadoVigencia
            ?.classificacao,
        "DURANTE_DO_CONTRATO"
    );

    assert.deepEqual(
        cenario.eventos,
        [
            "vigencia",
            "slot",
            "hash",
        ]
    );

    assert.equal(
        cenario.chamadasRpc.length,
        1
    );

    assert.equal(
        cenario
            .chamadasRpc[0]
            .nome,
        "certidao_mensal_validar_vigencia_contratual"
    );

    assert.deepEqual(
        cenario
            .chamadasRpc[0]
            .parametros,
        {
            p_empresa_id:
                EMPRESA_ID,

            p_competencia:
                COMPETENCIA,

            p_operacao:
                "persistir documento CERT2",
        }
    );
}

/*
 * ============================================================
 * 2 — ANTES DO CONTRATO
 * vigência bloqueia ANTES de slot e SHA
 * ============================================================
 */

{
    const cenario =
        criarCenario({
            data:
                null,

            error: {
                code:
                    "55000",

                message:
                    "A competência é anterior ao início do contrato. Operação bloqueada: persistir documento CERT2.",
            },
        });

    const resultado =
        await cenario
            .composto
            .validarAlvoPersistenciaPrincipalUploadMassa({
                preflight:
                    PREFLIGHT,

                hashSha256:
                    HASH,
            });

    assert.equal(
        resultado?.podeExecutar,
        false
    );

    assert.equal(
        resultado?.codigo,
        "PREFLIGHT_VIGENCIA_BLOQUEADA"
    );

    assert.equal(
        resultado?.etapa,
        "vigencia_contratual"
    );

    assert.equal(
        resultado
            ?.resultadoVigencia
            ?.liberada,
        false
    );

    assert.equal(
        resultado
            ?.resultadoVigencia
            ?.codigo,
        "VIGENCIA_CONTRATUAL_BLOQUEADA"
    );

    assert.match(
        resultado
            ?.resultadoVigencia
            ?.mensagem ||
            "",
        /anterior ao início do contrato/i
    );

    assert.deepEqual(
        cenario.eventos,
        [
            "vigencia",
        ]
    );
}

/*
 * ============================================================
 * 3 — FALHA TÉCNICA
 * também deve parar antes de slot/SHA
 * ============================================================
 */

{
    const cenario =
        criarCenario({
            data:
                null,

            error: {
                code:
                    "08006",

                message:
                    "connection failure",
            },
        });

    const resultado =
        await cenario
            .composto
            .validarAlvoPersistenciaPrincipalUploadMassa({
                preflight:
                    PREFLIGHT,

                hashSha256:
                    HASH,
            });

    assert.equal(
        resultado?.podeExecutar,
        false
    );

    assert.equal(
        resultado?.codigo,
        "PREFLIGHT_VIGENCIA_READER_FALHOU"
    );

    assert.equal(
        resultado?.etapa,
        "vigencia_reader"
    );

    assert.deepEqual(
        cenario.eventos,
        [
            "vigencia",
        ]
    );
}

/*
 * ============================================================
 * 4 — RETORNO REMOTO INCONSISTENTE
 * não pode ser convertido em autorização.
 * ============================================================
 */

{
    const cenario =
        criarCenario({
            data:
                "ANTES_DO_CONTRATO",

            error:
                null,
        });

    const resultado =
        await cenario
            .composto
            .validarAlvoPersistenciaPrincipalUploadMassa({
                preflight:
                    PREFLIGHT,

                hashSha256:
                    HASH,
            });

    assert.equal(
        resultado?.podeExecutar,
        false
    );

    assert.equal(
        resultado?.codigo,
        "PREFLIGHT_VIGENCIA_READER_FALHOU"
    );

    assert.deepEqual(
        cenario.eventos,
        [
            "vigencia",
        ]
    );
}

/*
 * ============================================================
 * SAFE_SCAN_CERT2_M1_A4A_EXECUTOR_ZERO_DYNAMIC
 *
 * 5 — PROVA DINÂMICA:
 * VIGÊNCIA BLOQUEADA => EXECUTOR = ZERO
 * ============================================================
 */

{
    const cenario =
        criarCenario({
            data:
                null,

            error: {
                code:
                    "55000",

                message:
                    "A competência é anterior ao início do contrato. Operação bloqueada: persistir documento CERT2.",
            },
        });

    let chamadasExecutor =
        0;

    const arquivoFixture =
        Object.freeze({
            name:
                "fixture-cnd-federal.pdf",

            size:
                1234,

            type:
                "application/pdf",
        });

    const resultadoLote = {
        itens: [
            {
                arquivo:
                    arquivoFixture,

                hash: {
                    sha256:
                        HASH,
                },

                proveniencia: {
                    nomeOriginal:
                        arquivoFixture.name,

                    tamanhoBytes:
                        arquivoFixture.size,

                    mimeType:
                        arquivoFixture.type,
                },

                leitura: {
                    metodo:
                        "fixture",

                    totalPaginas:
                        1,

                    paginasLidas:
                        1,

                    confianca:
                        100,
                },

                resolucao: {
                    status:
                        "PRONTO",

                    politica:
                        "COMPETENCIA",

                    empresa: {
                        status:
                            "IDENTIFICADA",

                        id:
                            EMPRESA_ID,

                        nome:
                            "Empresa Fixture",

                        cnpjCorrespondente:
                            "",
                    },

                    destino: {
                        competenciaIso:
                            COMPETENCIA,

                        fonte:
                            "FIXTURE",
                    },

                    tipoDocumento:
                        TIPO_DOCUMENTO,

                    tipoClassificador:
                        TIPO_DOCUMENTO,

                    titulo:
                        "CND Federal",

                    confianca:
                        95,

                    avaliacao: {
                        requerConsultaOficial:
                            false,
                    },

                    motivos:
                        [],
                },
            },
        ],
    };

    const saida =
        await executarPlanoPersistenciaPrincipalUploadMassa({
            resultado:
                resultadoLote,

            executarPersistencia:
                async () => {
                    chamadasExecutor +=
                        1;

                    throw new Error(
                        "EXECUTOR_NAO_DEVERIA_SER_CHAMADO"
                    );
                },

            validarPreflightAntesPersistencia:
                cenario
                    .composto
                    .validarAlvoPersistenciaPrincipalUploadMassa,

            habilitado:
                true,

            alvo: {
                indice:
                    0,

                hashSha256:
                    HASH,

                acao:
                    "PERSISTIR_NOVO_PRINCIPAL",
            },

            interromperNoErro:
                true,
        });

    /*
     * Garante que o item era realmente executável antes
     * do preflight de vigência.
     */
    assert.equal(
        saida
            ?.plano
            ?.resumo
            ?.elegiveis,
        1
    );

    assert.equal(
        saida?.executorInvocado,
        false
    );

    assert.equal(
        saida?.chamadas,
        0
    );

    assert.equal(
        chamadasExecutor,
        0
    );

    assert.equal(
        saida?.motivo,
        "PREFLIGHT_COMPOSTO_BLOQUEOU"
    );

    assert.equal(
        saida
            ?.resultados
            ?.[0]
            ?.codigo,
        "PREFLIGHT_VIGENCIA_BLOQUEADA"
    );

    assert.deepEqual(
        cenario.eventos,
        [
            "vigencia",
        ]
    );
}

/*
 * ============================================================
 * 6 — PROVA ESTÁTICA DO GATE ANTES DO EXECUTOR
 * ============================================================
 */

const planoSource =
    readFileSync(
        join(
            process.cwd(),
            "src/features/certidao-mensal-documental/services/certidaoMensalUploadMassaPersistencePlanService.js"
        ),
        "utf8"
    );

const indiceGuard =
    planoSource.indexOf(
        "somente podeExecutar === true permite alcançar"
    );

const indiceExecutor =
    planoSource.indexOf(
        "await executarPersistencia({"
    );

assert.ok(
    indiceGuard >=
        0,
    "Guard fail-closed do preflight não localizado."
);

assert.ok(
    indiceExecutor >
        indiceGuard,
    "O executor aparece antes do guard fail-closed."
);

const contextoSource =
    readFileSync(
        join(
            process.cwd(),
            "src/features/certidao-mensal-documental/contexts/CertidaoUploadMassaJobContext.jsx"
        ),
        "utf8"
    );

assert.match(
    contextoSource,
    /criarCertidaoMensalUploadMassaPreflightVigenciaReader/
);

assert.match(
    contextoSource,
    /criarCertidaoMensalUploadMassaPreflightComposto\(\{\s*vigenciaReader,\s*slotReader,\s*hashReader,/
);

console.log("");
console.log(
    "CERT2 — M1-A4A — PREFLIGHT DE VIGÊNCIA ANTES DO STORAGE APROVADO"
);
console.log(
    "Cenários: durante do contrato, antes do contrato, falha técnica e retorno remoto inconsistente."
);
console.log(
    "Bloqueio de vigência ocorre antes de Slot Reader, SHA Reader e executor de persistência."
);
console.log(
    "Nenhum Supabase remoto, Storage, commit, push, migration ou deploy foi utilizado pelo smoke."
);
