import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    CERTIDAO_MENSAL_DOCUMENTOS_AUTOMATICOS,
    CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS,
} from "../src/features/certidao-mensal-documental/domain/certidaoMensalRegraCompetencia.js";

import {
    CERTIDAO_MENSAL_RPC_MATERIALIZAR_ITENS_EXTERNOS,
    criarCertidaoMensalMaterializacaoItensService,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalMaterializacaoItensService.js";

const COMPETENCIA_ID =
    "11111111-1111-4111-8111-111111111111";

assert.equal(
    CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS.length,
    15,
    "A materialização deve trabalhar com quinze documentos externos.",
);

assert.equal(
    CERTIDAO_MENSAL_DOCUMENTOS_AUTOMATICOS.length,
    2,
    "Os dois itens automáticos devem permanecer fora desta RPC.",
);

{
    const chamadas = [];

    const servico =
        criarCertidaoMensalMaterializacaoItensService({
            clienteSupabase: {
                async rpc(
                    nome,
                    parametros,
                ) {
                    chamadas.push({
                        nome,
                        parametros,
                    });

                    return {
                        data: {
                            competenciaId:
                                COMPETENCIA_ID,
                            totalDocumentosExternos:
                                15,
                            itensCriados:
                                15,
                            itensExistentes:
                                0,
                            itensDisponiveis:
                                15,
                            materializadoEm:
                                "2026-08-06T12:30:00.000Z",
                        },
                        error:
                            null,
                    };
                },
            },
        });

    const resultado =
        await servico.materializarItensExternos({
            competenciaId:
                COMPETENCIA_ID,
        });

    assert.deepEqual(
        chamadas,
        [
            {
                nome:
                    CERTIDAO_MENSAL_RPC_MATERIALIZAR_ITENS_EXTERNOS,
                parametros: {
                    p_competencia_id:
                        COMPETENCIA_ID,
                },
            },
        ],
        "O serviço deve chamar somente a RPC de materialização da competência informada.",
    );

    assert.deepEqual(
        resultado,
        {
            competenciaId:
                COMPETENCIA_ID,
            totalDocumentosExternos:
                15,
            itensCriados:
                15,
            itensExistentes:
                0,
            itensDisponiveis:
                15,
            materializadoEm:
                "2026-08-06T12:30:00.000Z",
        },
    );
}

{
    let chamadaExecutada =
        false;

    const servico =
        criarCertidaoMensalMaterializacaoItensService({
            clienteSupabase: {
                async rpc() {
                    chamadaExecutada =
                        true;

                    return {
                        data:
                            null,
                        error:
                            null,
                    };
                },
            },
        });

    await assert.rejects(
        () =>
            servico.materializarItensExternos({
                competenciaId:
                    "competencia-invalida",
            }),
        /competência é inválida/i,
    );

    assert.equal(
        chamadaExecutada,
        false,
        "UUID inválido deve bloquear a chamada da RPC.",
    );
}

{
    const servico =
        criarCertidaoMensalMaterializacaoItensService({
            clienteSupabase: {
                async rpc() {
                    return {
                        data:
                            null,
                        error: {
                            message:
                                "Competência fechada.",
                        },
                    };
                },
            },
        });

    await assert.rejects(
        () =>
            servico.materializarItensExternos({
                competenciaId:
                    COMPETENCIA_ID,
            }),
        /competência fechada/i,
    );
}

{
    const servico =
        criarCertidaoMensalMaterializacaoItensService({
            clienteSupabase: {
                async rpc() {
                    return {
                        data: {
                            competenciaId:
                                COMPETENCIA_ID,
                            totalDocumentosExternos:
                                15,
                            itensCriados:
                                7,
                            itensExistentes:
                                0,
                            itensDisponiveis:
                                7,
                        },
                        error:
                            null,
                    };
                },
            },
        });

    await assert.rejects(
        () =>
            servico.materializarItensExternos({
                competenciaId:
                    COMPETENCIA_ID,
            }),
        /15 documentos externos/i,
    );
}

const __filename =
    fileURLToPath(
        import.meta.url,
    );

const __dirname =
    path.dirname(
        __filename,
    );

const migrationPath =
    path.resolve(
        __dirname,
        "../supabase/migrations/20260810092000_certidao_mensal_catalogo_17_15_2.sql",
    );

const migration =
    fs.readFileSync(
        migrationPath,
        "utf8",
    );

const inicioMaterializacao =
    migration.search(
        /create\s+or\s+replace\s+function\s+public\.materializar_itens_externos_certidao_mensal\s*\([^)]*\)/i,
    );

const fimMaterializacao =
    migration.search(
        /\n\s*revoke\s+all\s+on\s+function\s+public\.materializar_itens_externos_certidao_mensal/i,
    );

assert.ok(
    inicioMaterializacao >= 0,
    "A migration atual deve definir a RPC de materialização dos itens externos.",
);

assert.ok(
    fimMaterializacao > inicioMaterializacao,
    "Não foi possível isolar o corpo atual da RPC de materialização.",
);

const materializacaoSql =
    migration.slice(
        inicioMaterializacao,
        fimMaterializacao,
    );

const tiposExternos =
    CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS.map(
        (documento) =>
            documento.tipoDocumento,
    );

for (const tipo of tiposExternos) {
    assert.ok(
        materializacaoSql.includes(
            `'${tipo}'`,
        ),
        `A migration deve conter o tipo externo ${tipo}.`,
    );
}

for (
    const documentoAutomatico of
    CERTIDAO_MENSAL_DOCUMENTOS_AUTOMATICOS
) {
    assert.equal(
        materializacaoSql.includes(
            `('${documentoAutomatico.tipoDocumento}',`,
        ),
        false,
        `A migration não deve materializar ${documentoAutomatico.tipoDocumento} como item externo.`,
    );
}

const marcadoresObrigatorios = [
    "auth.uid() is null",
    "certidao_mensal_usuario_pode_acessar_competencia",
    "certidao_mensal_validar_vigencia_contratual",
    "v_competencia.status =",
    "'FECHADA'",
    "'UPLOAD'",
    "'PENDENTE'",
    "'NAO_APLICAVEL'",
    "versao_atual_id",
    "on conflict (",
    "do nothing",
    "itensDisponiveis",
    "ITENS_EXTERNOS_MATERIALIZADOS",
    "revoke all on function",
    "to authenticated",
    "to service_role",
];

for (const marcador of marcadoresObrigatorios) {
    assert.ok(
        migration.includes(
            marcador,
        ),
        `Marcador SQL obrigatório ausente: ${marcador}`,
    );
}

assert.equal(
    /storage|bucket_id|caminho_storage|nome_original|mime_type|tamanho_bytes/i.test(
        migration,
    ),
    false,
    "A materialização não pode criar arquivo, caminho de Storage ou metadados de PDF.",
);

console.log(
    "CERTIDÃO MENSAL — MATERIALIZAÇÃO DOS ITENS EXTERNOS APROVADA",
);

console.log(
    "Cenários validados: quinze itens externos, idempotência, bloqueio de competência fechada, autorização, ausência de PDF e tratamento de erro.",
);

console.log(
    "Nenhuma RPC real, alteração de banco, deploy ou notificação foi executada.",
);
