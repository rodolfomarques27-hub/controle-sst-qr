import assert from "node:assert/strict";
import {
    readFileSync,
} from "node:fs";
import {
    dirname,
    resolve,
} from "node:path";
import {
    fileURLToPath,
} from "node:url";

import {
    createServer,
    isRunnableDevEnvironment,
} from "vite";

const scriptDir =
    dirname(
        fileURLToPath(
            import.meta.url
        )
    );

const repoRoot =
    resolve(
        scriptDir,
        ".."
    );

const motorPath =
    resolve(
        repoRoot,
        "src/services/treinamentosRevisaoMotorService.js"
    );

const motorSource =
    readFileSync(
        motorPath,
        "utf8"
    );

assert.match(
    motorSource,
    /avaliarTreinamentosColaborador/
);

assert.match(
    motorSource,
    /calcularVencimentoTreinamento/
);

assert.match(
    motorSource,
    /verificarCertificadoTreinamento/
);

assert.match(
    motorSource,
    /listarEvidenciasCertificadosEmLoteService/
);

assert.match(
    motorSource,
    /calcularSha256ArquivoCertificadoService/
);

assert.match(
    motorSource,
    /buscarEvidenciaCorrentePorSha256Service/
);

assert.doesNotMatch(
    motorSource,
    /\.insert\s*\(/
);

assert.doesNotMatch(
    motorSource,
    /\.update\s*\(/
);

assert.doesNotMatch(
    motorSource,
    /\.delete\s*\(/
);

assert.doesNotMatch(
    motorSource,
    /\.upsert\s*\(/
);

assert.doesNotMatch(
    motorSource,
    /\.upload\s*\(/
);

assert.doesNotMatch(
    motorSource,
    /\.remove\s*\(/
);

let viteServer = null;

try {
    viteServer =
        await createServer({
            root:
                repoRoot,

            configFile:
                false,

            appType:
                "custom",

            logLevel:
                "error",

            optimizeDeps: {
                noDiscovery:
                    true,

                include:
                    [],
            },

            server: {
                middlewareMode:
                    true,

                hmr:
                    false,
            },
        });

    const ambienteSsr =
        viteServer
            ?.environments
            ?.ssr;

    assert.ok(
        ambienteSsr,
        "Vite deve expor o ambiente SSR."
    );

    assert.equal(
        isRunnableDevEnvironment(
            ambienteSsr
        ),
        true,
        "O ambiente SSR deve ser RunnableDevEnvironment."
    );

    const motor =
        await ambienteSsr
            .runner
            .import(
                "/src/services/treinamentosRevisaoMotorService.js"
            );

    assert.equal(
        motor
            .TREINAMENTOS_REVISAO_MOTOR_VERSAO,
        "treinamentos-revisao-motor-i2-p1-r4"
    );

    assert.equal(
        typeof motor
            .montarRevisaoTreinamentosReadOnly,
        "function"
    );

    const dependencias =
        motor
            .obterDependenciasCanonicasRevisaoTreinamentos();

    assert.equal(
        typeof dependencias
            .avaliarTreinamentosColaborador,
        "function"
    );

    assert.equal(
        typeof dependencias
            .calcularVencimentoTreinamento,
        "function"
    );

    assert.equal(
        typeof dependencias
            .verificarCertificadoTreinamento,
        "function"
    );

    assert.equal(
        typeof dependencias
            .obterUltimaVerificacaoDocumental,
        "function"
    );

    assert.equal(
        typeof dependencias
            .normalizarEvidenciaCertificado,
        "function"
    );

    assert.equal(
        typeof dependencias
            .listarEvidenciasCertificadosEmLoteService,
        "function"
    );

    const colaborador = {
        id:
            "11111111-1111-4111-8111-111111111111",

        nome:
            "COLABORADOR TESTE I2",

        funcao:
            "PEDREIRO",
    };

    {
        const resultado =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",
                        },

                        {
                            id:
                                "dddddddd-dddd-4ddd-8ddd-dddddddddddd",

                            treinamentoId:
                                14,

                            realizado:
                                "2026-08-01",

                            arquivoUrl:
                                "colaborador/ficha-epi.pdf",
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",

                            certificado_origem_id:
                                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "colaborador/nr12-certificado.pdf",

                            arquivo_sha256:
                                "a".repeat(
                                    64
                                ),

                            principal:
                                true,

                            historica:
                                false,
                        },

                        {
                            id:
                                "cccccccc-cccc-4ccc-8ccc-cccccccccccc",

                            certificado_origem_id:
                                "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "lista_presenca",

                            arquivo_url:
                                "colaborador/nr12-lista.pdf",

                            arquivo_sha256:
                                "b".repeat(
                                    64
                                ),

                            principal:
                                false,

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultado.readOnly,
            true
        );

        assert.equal(
            resultado
                .totalTreinamentosLogicos,
            1,
            "Certificado + lista de presença devem compor um único treinamento lógico."
        );

        assert.equal(
            resultado
                .denominadorTreinamentos,
            1
        );

        assert.equal(
            resultado
                .itens[0]
                .quantidadeEvidencias,
            2,
            "Múltiplas evidências não podem inflar o denominador."
        );

        assert.ok(
            resultado
                .itens[0]
                .evidencias
                .some(
                    (item) =>
                        item
                            .tipoEvidencia ===
                        "lista_presenca"
                ),
            "Lista de presença deve permanecer como evidência."
        );

        assert.equal(
            resultado
                .ignoradosDocumentais
                .some(
                    (item) =>
                        item
                            .treinamentoCodigo ===
                        14
                ),
            true,
            "Ficha de EPI deve ficar fora do denominador de treinamentos."
        );

        assert.notEqual(
            resultado
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .SEM_EVIDENCIA_SUFICIENTE
        );
    }

    {
        const resultadoSemEvidencia =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",
                        },
                    ],

                    evidencias:
                        [],
                });

        assert.equal(
            resultadoSemEvidencia
                .totalTreinamentosLogicos,
            1
        );

        assert.equal(
            resultadoSemEvidencia
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .SEM_EVIDENCIA_SUFICIENTE
        );
    }

    {
        const shaDuplicado =
            "f".repeat(
                64
            );

        const resultadoDuplicidade =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",
                        },

                        {
                            id:
                                "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb",

                            treinamentoId:
                                4,

                            realizado:
                                "2026-08-01",
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "33333333-cccc-4ccc-8ccc-cccccccccccc",

                            certificado_origem_id:
                                "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "duplicado/nr12.pdf",

                            arquivo_sha256:
                                shaDuplicado,

                            historica:
                                false,
                        },

                        {
                            id:
                                "44444444-dddd-4ddd-8ddd-dddddddddddd",

                            certificado_origem_id:
                                "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb",

                            treinamento_codigo:
                                4,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "duplicado/nr10.pdf",

                            arquivo_sha256:
                                shaDuplicado,

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoDuplicidade
                .totalTreinamentosLogicos,
            2
        );

        assert.equal(
            resultadoDuplicidade
                .itens
                .every(
                    (item) =>
                        item
                            .divergencias
                            .includes(
                                motor
                                    .TREINAMENTOS_REVISAO_DIVERGENCIAS
                                    .DUPLICIDADE_SHA
                            )
                ),
            true,
            "Mesmo SHA em treinamentos lógicos diferentes deve gerar divergência."
        );

        assert.equal(
            resultadoDuplicidade
                .itens
                .every(
                    (item) =>
                        item
                            .statusRevisao ===
                        motor
                            .TREINAMENTOS_REVISAO_STATUS
                            .DIVERGENTE
                ),
            true
        );
    }

    {
        const certificadoId =
            "55555555-eeee-4eee-8eee-eeeeeeeeeeee";

        const resultadoManual =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "66666666-ffff-4fff-8fff-ffffffffffff",

                            certificado_origem_id:
                                certificadoId,

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "manual/certificado.pdf",

                            arquivo_sha256:
                                "9".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],

                    verificacoes: [
                        {
                            documento_id:
                                certificadoId,

                            status_verificacao:
                                "revisao_manual",

                            nivel_risco:
                                "medio",

                            resumo:
                                "Confiança insuficiente para decisão automática.",

                            created_at:
                                "2026-09-08T12:00:00.000Z",
                        },
                    ],
                });

        assert.equal(
            resultadoManual
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .REVISAO_MANUAL_NECESSARIA
        );

        assert.equal(
            resultadoManual
                .requerRevisaoHumana,
            true
        );
    }

    {
        const resultadoIdentidade =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                "77777777-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "88888888-bbbb-4bbb-8bbb-bbbbbbbbbbbb",

                            certificado_origem_id:
                                "77777777-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "identidade/certificado.pdf",

                            arquivo_sha256:
                                "8".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],

                    verificacoes: [
                        {
                            documento_id:
                                "77777777-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            status_verificacao:
                                "suspeito",

                            nivel_risco:
                                "alto",

                            resumo:
                                "CPF divergente; possível outro colaborador.",

                            created_at:
                                "2026-09-08T13:00:00.000Z",
                        },
                    ],
                });

        assert.equal(
            resultadoIdentidade
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .IDENTIDADE_DIVERGENTE
                ),
            true
        );

        assert.equal(
            resultadoIdentidade
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .POSSIVEL_OUTRO_COLABORADOR
                ),
            true
        );

        assert.equal(
            resultadoIdentidade
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .DIVERGENTE
        );
    }

    {
        const certificadoId =
            "99999999-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

        const resultadoSemData =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                3,
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "99999999-bbbb-4bbb-8bbb-bbbbbbbbbbbb",

                            certificado_origem_id:
                                certificadoId,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "hardening/sem-data.pdf",

                            arquivo_sha256:
                                "1".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoSemData
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .REVISAO_MANUAL_NECESSARIA,
            "Treinamento com evidência e sem data não pode ficar CONFORME."
        );

        assert.ok(
            resultadoSemData
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .DATA_INSUFICIENTE
                )
        );
    }

    {
        const certificadoId =
            "99999999-cccc-4ccc-8ccc-cccccccccccc";

        const resultadoDataInvalida =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                3,

                            realizado:
                                "2026-99-99",
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "99999999-dddd-4ddd-8ddd-dddddddddddd",

                            certificado_origem_id:
                                certificadoId,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "hardening/data-invalida.pdf",

                            arquivo_sha256:
                                "2".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoDataInvalida
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .REVISAO_MANUAL_NECESSARIA,
            "Data inválida deve ser isolada no item sem derrubar a revisão."
        );
    }

    {
        const certificadoId =
            "99999999-eeee-4eee-8eee-eeeeeeeeeeee";

        const resultadoTreinamentoDesconhecido =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                999,

                            realizado:
                                "2026-08-01",
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "99999999-ffff-4fff-8fff-ffffffffffff",

                            certificado_origem_id:
                                certificadoId,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                999,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "hardening/treinamento-desconhecido.pdf",

                            arquivo_sha256:
                                "3".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoTreinamentoDesconhecido
                .itens[0]
                .treinamentoReconhecido,
            false
        );

        assert.equal(
            resultadoTreinamentoDesconhecido
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .REVISAO_MANUAL_NECESSARIA
        );

        assert.ok(
            resultadoTreinamentoDesconhecido
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .REGRA_NAO_RECONHECIDA
                )
        );
    }

    for (
        const statusVerificacao
        of [
            "bloqueado",
            "suspeito",
            "pendente",
        ]
    ) {
        const certificadoId =
            "aaaaaaaa-9999-4999-8999-999999999999";

        const vencimentoCanonico =
            dependencias
                .calcularVencimentoTreinamento(
                    3,
                    "2026-08-01"
                );

        const resultadoStatusCritico =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",

                            vencimento:
                                vencimentoCanonico,
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                `aaaaaaaa-${statusVerificacao}-4999-8999-999999999999`,

                            certificado_origem_id:
                                certificadoId,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                `hardening/${statusVerificacao}.pdf`,

                            arquivo_sha256:
                                (
                                    statusVerificacao ===
                                    "bloqueado"
                                        ? "4"
                                        : (
                                            statusVerificacao ===
                                            "suspeito"
                                                ? "5"
                                                : "6"
                                        )
                                ).repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],

                    verificacoes: [
                        {
                            documento_id:
                                certificadoId,

                            status_verificacao:
                                statusVerificacao,

                            created_at:
                                "2026-09-09T10:00:00.000Z",
                        },
                    ],
                });

        assert.equal(
            resultadoStatusCritico
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .REVISAO_MANUAL_NECESSARIA,
            `Status documental ${statusVerificacao} sem divergência explicada não pode ficar CONFORME.`
        );
    }

    {
        const certificadoId =
            "bbbbbbbb-9999-4999-8999-999999999999";

        const vencimentoCanonico =
            dependencias
                .calcularVencimentoTreinamento(
                    3,
                    "2026-08-01"
                );

        const resultadoOutroColaborador =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",

                            vencimento:
                                vencimentoCanonico,
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "bbbbbbbb-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            certificado_origem_id:
                                certificadoId,

                            colaborador_id:
                                "22222222-2222-4222-8222-222222222222",

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "hardening/outro-colaborador.pdf",

                            arquivo_sha256:
                                "7".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoOutroColaborador
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .DIVERGENTE
        );

        assert.ok(
            resultadoOutroColaborador
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .IDENTIDADE_DIVERGENTE
                )
        );

        assert.ok(
            resultadoOutroColaborador
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .VINCULO_EVIDENCIA_SUSPEITO
                )
        );
    }

    {
        const certificadoId =
            "cccccccc-9999-4999-8999-999999999999";

        const vencimentoCanonico =
            dependencias
                .calcularVencimentoTreinamento(
                    3,
                    "2026-08-01"
                );

        const resultadoTreinamentoDivergente =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",

                            vencimento:
                                vencimentoCanonico,
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "cccccccc-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            certificado_origem_id:
                                certificadoId,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                4,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "hardening/treinamento-divergente.pdf",

                            arquivo_sha256:
                                "8".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoTreinamentoDivergente
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .DIVERGENTE
        );

        assert.ok(
            resultadoTreinamentoDivergente
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .TREINAMENTO_DIVERGENTE
                )
        );
    }

    {
        const certificadoId =
            "dddddddd-9999-4999-8999-999999999999";

        const vencimentoCanonico =
            dependencias
                .calcularVencimentoTreinamento(
                    3,
                    "2026-08-01"
                );

        const resultadoTipoDesconhecido =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",

                            vencimento:
                                vencimentoCanonico,
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "dddddddd-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            certificado_origem_id:
                                certificadoId,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "tipo_nao_reconhecido",

                            arquivo_url:
                                "hardening/tipo-desconhecido.pdf",

                            arquivo_sha256:
                                "9".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoTipoDesconhecido
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .DIVERGENTE
        );

        assert.ok(
            resultadoTipoDesconhecido
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .DOCUMENTO_INCOMPATIVEL
                )
        );
    }

    {
        const certificadoIdA =
            "eeeeeeee-9999-4999-8999-999999999999";

        const certificadoIdB =
            "ffffffff-9999-4999-8999-999999999999";

        const vencimentoA =
            dependencias
                .calcularVencimentoTreinamento(
                    3,
                    "2026-08-01"
                );

        const vencimentoB =
            dependencias
                .calcularVencimentoTreinamento(
                    3,
                    "2026-07-01"
                );

        const resultadoDuplicidadeLogica =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoIdA,

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",

                            vencimento:
                                vencimentoA,
                        },

                        {
                            id:
                                certificadoIdB,

                            treinamentoId:
                                3,

                            realizado:
                                "2026-07-01",

                            vencimento:
                                vencimentoB,
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "eeeeeeee-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            certificado_origem_id:
                                certificadoIdA,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "hardening/duplicidade-logica.pdf",

                            arquivo_sha256:
                                "c".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoDuplicidadeLogica
                .denominadorTreinamentos,
            1,
            "Duplicidade lógica não pode inflar o denominador."
        );

        assert.equal(
            resultadoDuplicidadeLogica
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .DIVERGENTE
        );

        assert.ok(
            resultadoDuplicidadeLogica
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .DUPLICIDADE_LOGICA
                )
        );
    }

    {
        const certificadoId =
            "abababab-9999-4999-8999-999999999999";

        const resultadoSemValidadeComVencimento =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                1,

                            realizado:
                                "2026-08-01",

                            vencimento:
                                "2027-08-01",
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "abababab-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            certificado_origem_id:
                                certificadoId,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                1,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "hardening/sem-validade-com-vencimento.pdf",

                            arquivo_sha256:
                                "d".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoSemValidadeComVencimento
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .DIVERGENTE
        );

        assert.ok(
            resultadoSemValidadeComVencimento
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .DIVERGENCIA_TEMPORAL
                )
        );
    }

    {
        const certificadoId =
            "cdcdcdcd-9999-4999-8999-999999999999";

        const resultadoVencimentoAusente =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                3,

                            realizado:
                                "2026-08-01",
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "cdcdcdcd-aaaa-4aaa-8aaa-aaaaaaaaaaaa",

                            certificado_origem_id:
                                certificadoId,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "hardening/vencimento-ausente.pdf",

                            arquivo_sha256:
                                "e".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoVencimentoAusente
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .DIVERGENTE
        );

        assert.ok(
            resultadoVencimentoAusente
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .DIVERGENCIA_TEMPORAL
                )
        );
    }


    {
        const dataVencimento =
            new Date();

        dataVencimento.setHours(
            12,
            0,
            0,
            0
        );

        dataVencimento.setDate(
            dataVencimento.getDate() +
            15
        );

        const vencimentoAtencao =
            dataVencimento
                .toISOString()
                .slice(
                    0,
                    10
                );

        const dataRealizacao =
            new Date(
                `${vencimentoAtencao}T12:00:00`
            );

        dataRealizacao.setDate(
            dataRealizacao.getDate() -
            730
        );

        const realizacaoAtencao =
            dataRealizacao
                .toISOString()
                .slice(
                    0,
                    10
                );

        const certificadoId =
            "f0f0f0f0-1111-4111-8111-111111111111";

        const resultadoAtencao =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoId,

                            treinamentoId:
                                3,

                            realizado:
                                realizacaoAtencao,

                            vencimento:
                                vencimentoAtencao,
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "f0f0f0f0-2222-4222-8222-222222222222",

                            certificado_origem_id:
                                certificadoId,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                3,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "contrato-r4/vencendo-atencao.pdf",

                            arquivo_sha256:
                                "f".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoAtencao
                .itens[0]
                .statusTemporal
                .chave,
            "vencendo"
        );

        assert.equal(
            resultadoAtencao
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .ATENCAO
        );

        assert.equal(
            resultadoAtencao
                .itens[0]
                .requerRevisaoHumana,
            false
        );
    }

    {
        const resultadoManualSobreSemEvidencia =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                "f1f1f1f1-1111-4111-8111-111111111111",

                            treinamentoId:
                                999,

                            realizado:
                                "2026-08-01",
                        },
                    ],

                    evidencias:
                        [],
                });

        assert.equal(
            resultadoManualSobreSemEvidencia
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .REVISAO_MANUAL_NECESSARIA
        );

        const resultadoSemEvidenciaSobreDivergencia =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                "f2f2f2f2-1111-4111-8111-111111111111",

                            treinamentoId:
                                1,

                            realizado:
                                "2026-08-01",

                            vencimento:
                                "2027-08-01",
                        },
                    ],

                    evidencias:
                        [],
                });

        assert.equal(
            resultadoSemEvidenciaSobreDivergencia
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .SEM_EVIDENCIA_SUFICIENTE
        );

        assert.ok(
            resultadoSemEvidenciaSobreDivergencia
                .itens[0]
                .divergencias
                .includes(
                    motor
                        .TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .DIVERGENCIA_TEMPORAL
                )
        );

        const certificadoVencidoId =
            "f3f3f3f3-1111-4111-8111-111111111111";

        const resultadoDivergenteSobreVencido =
            motor
                .montarRevisaoTreinamentosReadOnly({
                    colaborador,

                    certificados: [
                        {
                            id:
                                certificadoVencidoId,

                            treinamentoId:
                                3,

                            realizado:
                                "2020-01-01",

                            vencimento:
                                "2021-12-31",
                        },
                    ],

                    evidencias: [
                        {
                            id:
                                "f3f3f3f3-2222-4222-8222-222222222222",

                            certificado_origem_id:
                                certificadoVencidoId,

                            colaborador_id:
                                colaborador.id,

                            treinamento_codigo:
                                4,

                            tipo_evidencia:
                                "certificado_individual",

                            arquivo_url:
                                "contrato-r4/divergente-vencido.pdf",

                            arquivo_sha256:
                                "1".repeat(
                                    64
                                ),

                            historica:
                                false,
                        },
                    ],
                });

        assert.equal(
            resultadoDivergenteSobreVencido
                .itens[0]
                .statusTemporal
                .chave,
            "vencido"
        );

        assert.equal(
            resultadoDivergenteSobreVencido
                .itens[0]
                .statusRevisao,
            motor
                .TREINAMENTOS_REVISAO_STATUS
                .DIVERGENTE
        );
    }

    {
        const dataVencimento =
            new Date();

        dataVencimento.setHours(
            12,
            0,
            0,
            0
        );

        dataVencimento.setDate(
            dataVencimento.getDate() +
            15
        );

        const vencimentoAtencao =
            dataVencimento
                .toISOString()
                .slice(
                    0,
                    10
                );

        const dataRealizacao =
            new Date(
                `${vencimentoAtencao}T12:00:00`
            );

        dataRealizacao.setDate(
            dataRealizacao.getDate() -
            730
        );

        const realizacaoAtencao =
            dataRealizacao
                .toISOString()
                .slice(
                    0,
                    10
                );

        const certificadoConformeId =
            "f4f4f4f4-1111-4111-8111-111111111111";

        const certificadoAtencaoId =
            "f5f5f5f5-1111-4111-8111-111111111111";

        const entrada = {
            colaborador: {
                ...colaborador,
            },

            certificados: [
                {
                    id:
                        certificadoConformeId,

                    treinamentoId:
                        1,

                    realizado:
                        "2026-08-01",
                },

                {
                    id:
                        certificadoAtencaoId,

                    treinamentoId:
                        3,

                    realizado:
                        realizacaoAtencao,

                    vencimento:
                        vencimentoAtencao,
                },
            ],

            evidencias: [
                {
                    id:
                        "f4f4f4f4-2222-4222-8222-222222222222",

                    certificado_origem_id:
                        certificadoConformeId,

                    colaborador_id:
                        colaborador.id,

                    treinamento_codigo:
                        1,

                    tipo_evidencia:
                        "certificado_individual",

                    arquivo_url:
                        "contrato-r4/conforme.pdf",

                    arquivo_sha256:
                        "2".repeat(
                            64
                        ),

                    historica:
                        false,
                },

                {
                    id:
                        "f5f5f5f5-2222-4222-8222-222222222222",

                    certificado_origem_id:
                        certificadoAtencaoId,

                    colaborador_id:
                        colaborador.id,

                    treinamento_codigo:
                        3,

                    tipo_evidencia:
                        "certificado_individual",

                    arquivo_url:
                        "contrato-r4/atencao.pdf",

                    arquivo_sha256:
                        "3".repeat(
                            64
                        ),

                    historica:
                        false,
                },
            ],

            verificacoes:
                [],
        };

        const fotografiaEntrada =
            JSON.parse(
                JSON.stringify(
                    entrada
                )
            );

        const congelarProfundo =
            (valor) => {
                if (
                    !valor ||
                    typeof valor !==
                        "object" ||
                    Object.isFrozen(
                        valor
                    )
                ) {
                    return valor;
                }

                Object.values(
                    valor
                )
                    .forEach(
                        congelarProfundo
                    );

                return Object.freeze(
                    valor
                );
            };

        congelarProfundo(
            entrada
        );

        const resultadoContrato =
            motor
                .montarRevisaoTreinamentosReadOnly(
                    entrada
                );

        assert.equal(
            resultadoContrato
                .denominadorTreinamentos,
            2
        );

        assert.equal(
            resultadoContrato
                .totalTreinamentosLogicos,
            2
        );

        const somaResumo =
            Object.values(
                resultadoContrato
                    .resumo
            )
                .reduce(
                    (
                        total,
                        quantidade
                    ) =>
                        total +
                        quantidade,
                    0
                );

        assert.equal(
            somaResumo,
            resultadoContrato
                .denominadorTreinamentos
        );

        assert.equal(
            resultadoContrato
                .resumo[
                motor
                    .TREINAMENTOS_REVISAO_STATUS
                    .CONFORME
            ],
            1
        );

        assert.equal(
            resultadoContrato
                .resumo[
                motor
                    .TREINAMENTOS_REVISAO_STATUS
                    .ATENCAO
            ],
            1
        );

        assert.equal(
            resultadoContrato
                .percentualConformidade,
            50,
            "ATENÇÃO não pode ser contabilizada como CONFORME no percentual estrito."
        );

        assert.equal(
            resultadoContrato
                .readOnly,
            true
        );

        assert.equal(
            resultadoContrato
                .itens
                .every(
                    (item) =>
                        item?.readOnly ===
                        true
                ),
            true
        );

        assert.deepEqual(
            JSON.parse(
                JSON.stringify(
                    entrada
                )
            ),
            fotografiaEntrada,
            "O motor read-only não pode alterar os dados de entrada."
        );
    }

    console.log("");
    console.log(
        "I2_P1_R4_VITE_MODULE_RUNNER=OK"
    );
    console.log(
        "I2_P1_R4_CANONICAL_DEPENDENCIES=OK"
    );
    console.log(
        "I2_P1_R4_LOGICAL_DENOMINATOR=OK"
    );
    console.log(
        "I2_P1_R4_LISTA_PRESENCA_EVIDENCIA=OK"
    );
    console.log(
        "I2_P1_R4_FICHA_EPI_NOT_TRAINING=OK"
    );
    console.log(
        "I2_P1_R4_SHA_DUPLICATION=OK"
    );
    console.log(
        "I2_P1_R4_MANUAL_REVIEW=OK"
    );
    console.log(
        "I2_P1_R4_IDENTITY_DIVERGENCE=OK"
    );
    console.log(
        "I2_P1_R4_MISSING_DATE_GUARD=OK"
    );
    console.log(
        "I2_P1_R4_INVALID_DATE_ISOLATION=OK"
    );
    console.log(
        "I2_P1_R4_UNKNOWN_TRAINING_GUARD=OK"
    );
    console.log(
        "I2_P1_R4_VERIFICATION_STATUS_GUARD=OK"
    );
    console.log(
        "I2_P1_R4_EVIDENCE_COLLABORATOR_LINK=OK"
    );
    console.log(
        "I2_P1_R4_EVIDENCE_TRAINING_LINK=OK"
    );
    console.log(
        "I2_P1_R4_EVIDENCE_TYPE_GUARD=OK"
    );
    console.log(
        "I2_P1_R4_LOGICAL_DUPLICATION=OK"
    );
    console.log(
        "I2_P1_R4_TEMPORAL_PERSISTENCE_GUARD=OK"
    );
    console.log(
        "I2_P1_R4_VENCENDO_ATENCAO=OK"
    );
    console.log(
        "I2_P1_R4_STATUS_PRECEDENCE=OK"
    );
    console.log(
        "I2_P1_R4_SUMMARY_DENOMINATOR=OK"
    );
    console.log(
        "I2_P1_R4_STRICT_PERCENTAGE=OK"
    );
    console.log(
        "I2_P1_R4_READONLY_CONTRACT=OK"
    );
    console.log(
        "SAFESCAN_TREINAMENTOS_REVISAO_I2_P1_R4_SMOKE_OK"
    );
} finally {
    if (viteServer) {
        await viteServer.close();
    }
}
