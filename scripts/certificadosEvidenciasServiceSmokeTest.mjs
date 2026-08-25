import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
    TIPOS_EVIDENCIA_CORRENTE,
    TIPOS_EVIDENCIA_LEGADA,
    listarEvidenciasCertificadoService,
    listarEvidenciasCertificadosEmLoteService,
    normalizarEvidenciaCertificado,
    registrarEvidenciaCorrenteCertificadoService,
    tipoEvidenciaCorrentePermitido,
} from "../src/services/certificadosEvidenciasService.js";

const CERTIFICADO =
    "11111111-1111-4111-8111-111111111111";

const CERTIFICADO_2 =
    "22222222-2222-4222-8222-222222222222";

const COLABORADOR =
    "33333333-3333-4333-8333-333333333333";

const EVIDENCIA =
    "55555555-5555-4555-8555-555555555555";

function criarSupabaseMock({
    selectData = [],
    queryError = null,
    rpcData = null,
    rpcError = null,
} = {}) {
    const chamadas = [];

    const builder = {
        select(campos) {
            chamadas.push({
                metodo: "select",
                campos,
            });

            return this;
        },

        eq(campo, valor) {
            chamadas.push({
                metodo: "eq",
                campo,
                valor,
            });

            return this;
        },

        in(campo, valores) {
            chamadas.push({
                metodo: "in",
                campo,
                valores,
            });

            return this;
        },

        order(campo, opcoes) {
            chamadas.push({
                metodo: "order",
                campo,
                opcoes,
            });

            return this;
        },

        then(resolve, reject) {
            return Promise.resolve({
                data: selectData,
                error: queryError,
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
                    metodo: "from",
                    tabela,
                });

                return builder;
            },

            rpc(nome, parametros) {
                chamadas.push({
                    metodo: "rpc",
                    nome,
                    parametros,
                });

                return Promise.resolve({
                    data: rpcData,
                    error: rpcError,
                });
            },
        },
    };
}

assert.deepEqual(
    TIPOS_EVIDENCIA_CORRENTE,
    [
        "certificado_individual",
        "lista_presenca",
        "evidencia_complementar",
    ]
);

assert.deepEqual(
    TIPOS_EVIDENCIA_LEGADA,
    [
        "documento_principal_legado",
        "versao_historica_legada",
    ]
);

assert.equal(
    tipoEvidenciaCorrentePermitido(
        "CERTIFICADO_INDIVIDUAL"
    ),
    true
);

assert.equal(
    tipoEvidenciaCorrentePermitido(
        "versao_historica_legada"
    ),
    false
);

const normalizada =
    normalizarEvidenciaCertificado({
        id:
            EVIDENCIA,

        certificado_origem_id:
            CERTIFICADO,

        colaborador_id:
            COLABORADOR,

        treinamento_codigo:
            3,

        tipo_evidencia:
            "lista_presenca",

        arquivo_url:
            "colaborador/3/lista.pdf",

        principal:
            false,

        historica:
            false,
    });

assert.equal(
    normalizada.tipoEvidencia,
    "lista_presenca"
);

assert.equal(
    normalizada.tipoEvidenciaReconhecido,
    true
);

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

                    tipo_evidencia:
                        "certificado_individual",

                    arquivo_url:
                        "colaborador/3/certificado.pdf",

                    principal:
                        true,

                    historica:
                        false,
                },
            ],
        });

    const resultado =
        await listarEvidenciasCertificadoService({
            supabase:
                mock.supabase,

            certificadoId:
                CERTIFICADO,
        });

    assert.equal(
        resultado.length,
        1
    );

    assert.ok(
        mock.chamadas.some(
            (item) =>
                item.metodo === "eq" &&
                item.campo ===
                    "certificado_origem_id" &&
                item.valor ===
                    CERTIFICADO
        )
    );

    assert.ok(
        mock.chamadas.some(
            (item) =>
                item.metodo === "eq" &&
                item.campo ===
                    "historica" &&
                item.valor === false
        )
    );
}

{
    const mock =
        criarSupabaseMock();

    await listarEvidenciasCertificadosEmLoteService({
        supabase:
            mock.supabase,

        certificadoIds: [
            CERTIFICADO,
            CERTIFICADO,
            CERTIFICADO_2,
        ],
    });

    const chamadaIn =
        mock.chamadas.find(
            (item) =>
                item.metodo === "in"
        );

    assert.ok(chamadaIn);

    assert.deepEqual(
        chamadaIn.valores,
        [
            CERTIFICADO,
            CERTIFICADO_2,
        ]
    );
}

for (
    const tipoEvidencia
    of TIPOS_EVIDENCIA_CORRENTE
) {
    const principal =
        tipoEvidencia ===
        "certificado_individual";

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

                tipo_evidencia:
                    tipoEvidencia,

                arquivo_url:
                    `colaborador/3/${tipoEvidencia}.pdf`,

                arquivo_nome:
                    `${tipoEvidencia}.pdf`,

                principal,

                historica:
                    false,

                origem:
                    "upload",
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

                tipoTreinamento:
                    "NR-12 Máquinas e Equipamentos",

                nomeTreinamento:
                    "NR-12 Máquinas e Equipamentos",

                dataRealizacao:
                    "2026-08-04",

                dataVencimento:
                    "2027-08-04",

                tipoEvidencia,

                arquivoUrl:
                    `colaborador/3/${tipoEvidencia}.pdf`,

                arquivoNome:
                    `${tipoEvidencia}.pdf`,

                principal,
            },
        });

    const chamadaRpc =
        mock.chamadas.find(
            (item) =>
                item.metodo === "rpc"
        );

    assert.ok(
        chamadaRpc
    );

    assert.equal(
        chamadaRpc.nome,
        "registrar_certificado_evidencia_corrente"
    );

    assert.equal(
        chamadaRpc.parametros
            .p_certificado_origem_id,
        CERTIFICADO
    );

    assert.equal(
        chamadaRpc.parametros
            .p_colaborador_id,
        COLABORADOR
    );

    assert.equal(
        chamadaRpc.parametros
            .p_treinamento_codigo,
        3
    );

    assert.equal(
        chamadaRpc.parametros
            .p_tipo_evidencia,
        tipoEvidencia
    );

    assert.equal(
        chamadaRpc.parametros
            .p_principal,
        principal
    );

    assert.equal(
        resultado.tipoEvidencia,
        tipoEvidencia
    );
}

for (
    const tipoLegado
    of TIPOS_EVIDENCIA_LEGADA
) {
    const mock =
        criarSupabaseMock();

    await assert.rejects(
        registrarEvidenciaCorrenteCertificadoService({
            supabase:
                mock.supabase,

            evidencia: {
                certificadoOrigemId:
                    CERTIFICADO,

                colaboradorId:
                    COLABORADOR,

                treinamentoCodigo:
                    3,

                tipoEvidencia:
                    tipoLegado,

                arquivoUrl:
                    "colaborador/3/legado.pdf",
            },
        }),
        /Tipo de evidência não permitido/
    );

    assert.equal(
        mock.chamadas.some(
            (item) =>
                item.metodo === "rpc"
        ),
        false
    );
}

{
    const mock =
        criarSupabaseMock();

    await assert.rejects(
        registrarEvidenciaCorrenteCertificadoService({
            supabase:
                mock.supabase,

            evidencia: {
                certificadoOrigemId:
                    CERTIFICADO,

                colaboradorId:
                    COLABORADOR,

                treinamentoCodigo:
                    3,

                tipoEvidencia:
                    "lista_presenca",

                arquivoUrl:
                    "colaborador/3/lista.pdf",

                historica:
                    true,
            },
        }),
        /não pode registrar evidência histórica/
    );

    assert.equal(
        mock.chamadas.some(
            (item) =>
                item.metodo === "rpc"
        ),
        false
    );
}

{
    const mock =
        criarSupabaseMock({
            rpcError: {
                message:
                    "falha RPC simulada",
            },
        });

    await assert.rejects(
        registrarEvidenciaCorrenteCertificadoService({
            supabase:
                mock.supabase,

            evidencia: {
                certificadoOrigemId:
                    CERTIFICADO,

                colaboradorId:
                    COLABORADOR,

                treinamentoCodigo:
                    3,

                tipoEvidencia:
                    "certificado_individual",

                arquivoUrl:
                    "colaborador/3/certificado.pdf",
            },
        }),
        /falha RPC simulada/
    );
}

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

const pageSource =
    readFileSync(
        new URL(
            "../src/components/treinamentos/TreinamentosPage.jsx",
            import.meta.url
        ),
        "utf8"
    );

const envioSource =
    readFileSync(
        new URL(
            "../src/components/treinamentos/EnvioLoteTreinamentos.jsx",
            import.meta.url
        ),
        "utf8"
    );

const migrationBaseSource =
    readFileSync(
        new URL(
            "../supabase/migrations/20260825075921_certificados_multiplas_evidencias.sql",
            import.meta.url
        ),
        "utf8"
    );

const migrationRpcSource =
    readFileSync(
        new URL(
            "../supabase/migrations/20260825091300_certificados_evidencias_rpc_atomica.sql",
            import.meta.url
        ),
        "utf8"
    );

assert.match(
    serviceSource,
    /const rpc =[\s\S]*registrar_certificado_evidencia_corrente_sha256[\s\S]*registrar_certificado_evidencia_corrente/
);

assert.match(
    serviceSource,
    /await supabase\.rpc\(\s*rpc,\s*parametros\s*\)/
);

assert.doesNotMatch(
    serviceSource,
    /\.insert\s*\(/
);

assert.doesNotMatch(
    serviceSource,
    /\.update\s*\(|\.delete\s*\(|\.storage\b|\.upload\s*\(|\.remove\s*\(/
);

assert.match(
    handlerSource,
    /registrarEvidenciaCorrenteCertificadoService/
);

assert.match(
    handlerSource,
    /arquivoEvidenciaUrl/
);

assert.match(
    handlerSource,
    /evidenciaPrincipalSolicitada/
);

assert.match(
    crudSource,
    /const preservarSnapshotLista =[\s\S]*evidenciaListaPresenca[\s\S]*mesmaDataRealizacao/
);

assert.match(
    crudSource,
    /if \(\s*!preservarSnapshotLista\s*&&\s*!evidenciaDuplicada\s*\)/
);

assert.match(
    crudSource,
    /arquivoEvidenciaUrl:[\s\S]*arquivo\.arquivoUrl/
);

assert.match(
    crudSource,
    /evidenciaPrincipalSolicitada:[\s\S]*evidenciaIndividual[\s\S]*!preservarSnapshotLista/
);

assert.match(
    pageSource,
    /function treinamentoAdmiteMultiplasEvidenciasLote/
);

assert.match(
    pageSource,
    /categoriaEhDocumento[\s\S]*nomeEhDocumentoSemPar/
);

assert.match(
    pageSource,
    /atestado de saude ocupacional[\s\S]*ordem de servico[\s\S]*procedimento operacional/
);

assert.match(
    pageSource,
    /function obterTipoEvidenciaTreinamentoLote[\s\S]*"individual"[\s\S]*"certificado_individual"[\s\S]*"lista_presenca"/
);

assert.match(
    pageSource,
    /tipoEvidenciaTreinamento:[\s\S]*obterTipoEvidenciaTreinamentoLote\([\s\S]*item[\s\S]*\)/
);

assert.match(
    envioSource,
    /Tipo detectado:[\s\S]*tipoDocumentoTreinamentoLabel/
);

assert.match(
    migrationBaseSource,
    /create table\s+public\.certificados_evidencias/i
);

assert.match(
    migrationRpcSource,
    /create function[\s\S]*registrar_certificado_evidencia_corrente/i
);

assert.match(
    migrationRpcSource,
    /for update;/i
);

console.log("");
console.log(
    "certificadosEvidenciasServiceSmokeTest E3: OK"
);
console.log(
    "Registro de evidência via RPC: OK"
);
console.log(
    "Lista mesma realização preserva snapshot: PROTEGIDO"
);
console.log(
    "Certificado individual solicita principal: PROTEGIDO"
);
console.log(
    "Classificação lote individual/lista: CONECTADA"
);
console.log(
    "Storage real: NÃO ACESSADO PELO TESTE"
);
console.log(
    "Supabase real: NÃO ACESSADO PELO TESTE"
);
