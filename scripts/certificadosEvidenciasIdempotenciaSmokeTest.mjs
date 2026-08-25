import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
    buscarEvidenciaCorrentePorSha256Service,
    calcularSha256ArquivoCertificadoService,
    registrarEvidenciaCorrenteCertificadoService,
} from "../src/services/certificadosEvidenciasService.js";

const CERTIFICADO =
    "11111111-1111-4111-8111-111111111111";

const COLABORADOR =
    "33333333-3333-4333-8333-333333333333";

const EVIDENCIA =
    "55555555-5555-4555-8555-555555555555";

const CONTEUDO =
    "SafeScan E3-IDEMP-1 fingerprint smoke";

const SHA =
    createHash(
        "sha256"
    )
        .update(
            CONTEUDO
        )
        .digest(
            "hex"
        );

function criarArquivoMock() {
    const bytes =
        Buffer.from(
            CONTEUDO,
            "utf8"
        );

    return {
        name:
            "teste.pdf",

        type:
            "application/pdf",

        async arrayBuffer() {
            return bytes.buffer.slice(
                bytes.byteOffset,
                bytes.byteOffset +
                    bytes.byteLength
            );
        },
    };
}

function criarSupabaseMock({
    selectData = [],
    queryError = null,
    rpcData = null,
    rpcError = null,
} = {}) {
    const chamadas =
        [];

    const builder = {
        select(campos) {
            chamadas.push({
                metodo:
                    "select",

                campos,
            });

            return this;
        },

        eq(campo, valor) {
            chamadas.push({
                metodo:
                    "eq",

                campo,

                valor,
            });

            return this;
        },

        order(campo, opcoes) {
            chamadas.push({
                metodo:
                    "order",

                campo,

                opcoes,
            });

            return this;
        },

        limit(valor) {
            chamadas.push({
                metodo:
                    "limit",

                valor,
            });

            return this;
        },

        then(resolve, reject) {
            return Promise.resolve({
                data:
                    selectData,

                error:
                    queryError,
            }).then(
                resolve,
                reject
            );
        },
    };

    return {
        chamadas,

        supabase: {
            from(tabela) {
                chamadas.push({
                    metodo:
                        "from",

                    tabela,
                });

                return builder;
            },

            rpc(nome, parametros) {
                chamadas.push({
                    metodo:
                        "rpc",

                    nome,

                    parametros,
                });

                return Promise.resolve({
                    data:
                        rpcData,

                    error:
                        rpcError,
                });
            },
        },
    };
}

/*
 * SHA REAL
 */
{
    const calculado =
        await calcularSha256ArquivoCertificadoService(
            criarArquivoMock()
        );

    assert.equal(
        calculado,
        SHA
    );

    assert.match(
        calculado,
        /^[0-9a-f]{64}$/
    );
}

/*
 * LOOKUP POR SHA
 */
{
    const mock =
        criarSupabaseMock({
            selectData: [
                {
                    id:
                        EVIDENCIA,

                    certificado_origem_id:
                        CERTIFICADO,

                    colaborador_id:
                        COLABORADOR,

                    treinamento_codigo:
                        3,

                    data_realizacao:
                        "2026-08-04",

                    tipo_evidencia:
                        "lista_presenca",

                    arquivo_url:
                        "col-roge/3/lista.pdf",

                    arquivo_nome:
                        "lista.pdf",

                    arquivo_sha256:
                        SHA,

                    principal:
                        false,

                    historica:
                        false,
                },
            ],
        });

    const resultado =
        await buscarEvidenciaCorrentePorSha256Service({
            supabase:
                mock.supabase,

            colaboradorId:
                COLABORADOR,

            treinamentoCodigo:
                3,

            dataRealizacao:
                "2026-08-04",

            tipoEvidencia:
                "lista_presenca",

            arquivoSha256:
                SHA,
        });

    assert.equal(
        resultado?.id,
        EVIDENCIA
    );

    assert.equal(
        resultado?.arquivoSha256,
        SHA
    );

    const filtros = [
        [
            "historica",
            false,
        ],
        [
            "colaborador_id",
            COLABORADOR,
        ],
        [
            "treinamento_codigo",
            3,
        ],
        [
            "data_realizacao",
            "2026-08-04",
        ],
        [
            "tipo_evidencia",
            "lista_presenca",
        ],
        [
            "arquivo_sha256",
            SHA,
        ],
    ];

    for (
        const [
            campo,
            valor,
        ]
        of filtros
    ) {
        assert.ok(
            mock.chamadas.some(
                (item) =>
                    item.metodo ===
                        "eq" &&
                    item.campo ===
                        campo &&
                    item.valor ===
                        valor
            ),
            `Filtro SHA ausente: ${campo}`
        );
    }
}

/*
 * RPC SHA-AWARE
 */
{
    const mock =
        criarSupabaseMock({
            rpcData: {
                id:
                    EVIDENCIA,

                certificado_origem_id:
                    CERTIFICADO,

                colaborador_id:
                    COLABORADOR,

                treinamento_codigo:
                    3,

                data_realizacao:
                    "2026-08-04",

                tipo_evidencia:
                    "certificado_individual",

                arquivo_url:
                    "col-roge/3/certificado.pdf",

                arquivo_nome:
                    "certificado.pdf",

                arquivo_sha256:
                    SHA,

                principal:
                    true,

                historica:
                    false,
            },
        });

    const resultado =
        await registrarEvidenciaCorrenteCertificadoService({
            supabase:
                mock.supabase,

            evidencia: {
                certificadoOrigemId:
                    CERTIFICADO,

                colaboradorId:
                    COLABORADOR,

                treinamentoCodigo:
                    3,

                dataRealizacao:
                    "2026-08-04",

                tipoEvidencia:
                    "certificado_individual",

                arquivoUrl:
                    "col-roge/3/certificado.pdf",

                arquivoNome:
                    "certificado.pdf",

                arquivoSha256:
                    SHA,

                principal:
                    true,
            },
        });

    const rpc =
        mock.chamadas.find(
            (item) =>
                item.metodo ===
                "rpc"
        );

    assert.equal(
        rpc?.nome,
        "registrar_certificado_evidencia_corrente_sha256"
    );

    assert.equal(
        rpc?.parametros
            ?.p_arquivo_sha256,
        SHA
    );

    assert.equal(
        resultado?.arquivoSha256,
        SHA
    );
}

/*
 * FALLBACK E3R SEM SHA
 */
{
    const mock =
        criarSupabaseMock({
            rpcData: {
                id:
                    EVIDENCIA,

                certificado_origem_id:
                    CERTIFICADO,

                colaborador_id:
                    COLABORADOR,

                treinamento_codigo:
                    3,

                data_realizacao:
                    "2026-08-04",

                tipo_evidencia:
                    "lista_presenca",

                arquivo_url:
                    "col-roge/3/lista-legada.pdf",

                principal:
                    false,

                historica:
                    false,
            },
        });

    await registrarEvidenciaCorrenteCertificadoService({
        supabase:
            mock.supabase,

        evidencia: {
            certificadoOrigemId:
                CERTIFICADO,

            colaboradorId:
                COLABORADOR,

            treinamentoCodigo:
                3,

            dataRealizacao:
                "2026-08-04",

            tipoEvidencia:
                "lista_presenca",

            arquivoUrl:
                "col-roge/3/lista-legada.pdf",
        },
    });

    const rpc =
        mock.chamadas.find(
            (item) =>
                item.metodo ===
                "rpc"
        );

    assert.equal(
        rpc?.nome,
        "registrar_certificado_evidencia_corrente"
    );

    assert.equal(
        Object.prototype.hasOwnProperty.call(
            rpc?.parametros || {},
            "p_arquivo_sha256"
        ),
        false
    );
}

/*
 * GUARDAS ESTÁTICAS
 */
const serviceSource =
    readFileSync(
        new URL(
            "../src/services/certificadosEvidenciasService.js",
            import.meta.url
        ),
        "utf8"
    );

const crudSource =
    readFileSync(
        new URL(
            "../src/services/certificadosCrudService.js",
            import.meta.url
        ),
        "utf8"
    );

const handlerSource =
    readFileSync(
        new URL(
            "../src/services/appTreinamentosHandlersService.js",
            import.meta.url
        ),
        "utf8"
    );

const storageSource =
    readFileSync(
        new URL(
            "../src/services/certificadosStorageService.js",
            import.meta.url
        ),
        "utf8"
    );

const migrationSource =
    readFileSync(
        new URL(
            "../supabase/migrations/20260825111500_certificados_evidencias_sha256_idempotencia.sql",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    serviceSource,
    /cryptoApi\.subtle\.digest\(\s*"SHA-256",/
);

assert.match(
    serviceSource,
    /const rpc =[\s\S]*registrar_certificado_evidencia_corrente_sha256[\s\S]*registrar_certificado_evidencia_corrente/
);

assert.match(
    serviceSource,
    /await supabase\.rpc\(\s*rpc,\s*parametros\s*\)/
);

assert.match(
    crudSource,
    /await buscarEvidenciaCorrentePorSha256Service/
);

assert.match(
    crudSource,
    /const arquivo =[\s\S]*evidenciaDuplicada[\s\S]*await enviarArquivoCertificado/
);

assert.match(
    crudSource,
    /if \(\s*!preservarSnapshotLista\s*&&\s*!evidenciaDuplicada\s*\)/
);

const indiceBusca =
    crudSource.indexOf(
        "await buscarEvidenciaCorrentePorSha256Service"
    );

const indiceUpload =
    crudSource.indexOf(
        "await enviarArquivoCertificado"
    );

assert.ok(
    indiceBusca >= 0
);

assert.ok(
    indiceUpload >= 0
);

assert.ok(
    indiceBusca <
        indiceUpload
);

assert.match(
    handlerSource,
    /arquivoSha256:[\s\S]*certificadoNormalizado[\s\S]*\.arquivoSha256/
);

assert.match(
    storageSource,
    /\$\{Date\.now\(\)\}-\$\{identificadorVersao\}-\$\{nomeSeguro\}/
);

assert.match(
    storageSource,
    /upsert:\s*false/
);

assert.match(
    migrationSource,
    /add column arquivo_sha256 text null/
);

assert.match(
    migrationSource,
    /registrar_certificado_evidencia_corrente_sha256/
);

console.log("");
console.log(
    "E3-IDEMP-1 smoke: OK"
);
console.log(
    "SHA-256 real: PASS"
);
console.log(
    "lookup SHA antes do upload: PASS"
);
console.log(
    "duplicata SHA pula upload: PROTEGIDO"
);
console.log(
    "duplicata SHA não altera snapshot: PROTEGIDO"
);
console.log(
    "RPC SHA-aware: CONECTADA"
);
console.log(
    "RPC E3R antiga: FALLBACK PRESERVADO"
);
console.log(
    "Storage path/upsert:false: PRESERVADOS"
);
console.log(
    "Supabase real: NÃO ACESSADO PELO TESTE"
);
console.log(
    "Storage real: NÃO ACESSADO PELO TESTE"
);
