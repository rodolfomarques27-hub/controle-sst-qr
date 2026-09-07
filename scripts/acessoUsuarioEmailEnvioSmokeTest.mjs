import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    enviarAcessoUsuarioEmailService,
    gerarChaveIdempotenciaAcessoUsuarioEmail,
    listarHistoricoAcessoUsuarioEmailService,
    normalizarRegistroHistoricoAcessoUsuarioEmail,
} from "../src/services/acessoUsuarioEmailEnvioService.js";

const atual =
    fileURLToPath(
        import.meta.url
    );

const repo =
    path.resolve(
        path.dirname(atual),
        ".."
    );

const servicePath =
    path.join(
        repo,
        "src",
        "services",
        "acessoUsuarioEmailEnvioService.js"
    );

const codigo =
    fs.readFileSync(
        servicePath,
        "utf8"
    );

const uuidEnvio =
    "123e4567-e89b-42d3-a456-426614174000";

const uuidReenvio =
    "223e4567-e89b-42d3-a456-426614174000";

const uuidHistorico =
    "323e4567-e89b-42d3-a456-426614174000";

const senhaFicticia =
    "SafeScan#4821";

const snapshot = {
    versao: 1,
    perfil: "consulta",
    ativo: true,
    bloqueado: false,
    acesso_global: false,
    origem_perfil: "perfil_editavel",
    origem_permissoes: "perfil_editavel",
    modulos: {
        dashboard_sst: {
            visualizar: true,
        },
    },
};

assert.equal(
    gerarChaveIdempotenciaAcessoUsuarioEmail({
        geradorUuid: () => uuidEnvio.toUpperCase(),
    }),
    uuidEnvio
);

assert.throws(
    () =>
        gerarChaveIdempotenciaAcessoUsuarioEmail({
            geradorUuid: () => "nao-e-uuid",
        }),
    /UUID válida/
);

const chamadasInvoke = [];

const supabaseEnvio = {
    functions: {
        invoke: async (
            nome,
            opcoes
        ) => {
            chamadasInvoke.push({
                nome,
                opcoes,
            });

            return {
                data: {
                    ok: true,
                    idempotente: false,
                    envioId: uuidHistorico,
                    status: "ENVIADO",
                    tipoModelo: "acesso_usuario_criado",
                    modeloVersao: 1,
                },
                error: null,
            };
        },
    },
};

const resultadoEnvio =
    await enviarAcessoUsuarioEmailService({
        supabase: supabaseEnvio,
        usuarioEmail: " USUARIO.TESTE@EXAMPLE.COM ",
        senhaTemporaria: senhaFicticia,
        permissoesSnapshot: snapshot,
        chaveIdempotencia: uuidEnvio,
    });

assert.equal(
    chamadasInvoke.length,
    1
);

assert.equal(
    chamadasInvoke[0].nome,
    "enviar-email-acesso-usuario"
);

assert.deepEqual(
    chamadasInvoke[0].opcoes.body,
    {
        usuarioEmail: "usuario.teste@example.com",
        senhaTemporaria: senhaFicticia,
        permissoesSnapshot: snapshot,
        chaveIdempotencia: uuidEnvio,
        reenvioDeId: null,
    }
);

assert.deepEqual(
    resultadoEnvio,
    {
        ok: true,
        idempotente: false,
        envioId: uuidHistorico,
        status: "ENVIADO",
        tipoModelo: "acesso_usuario_criado",
        modeloVersao: 1,
        chaveIdempotencia: uuidEnvio,
        reenvioDeId: null,
    }
);

assert.equal(
    JSON.stringify(
        resultadoEnvio
    ).includes(
        senhaFicticia
    ),
    false,
    "Resultado do service não pode devolver a senha temporária."
);

const chamadasReenvio = [];

const supabaseReenvio = {
    functions: {
        invoke: async (
            nome,
            opcoes
        ) => {
            chamadasReenvio.push({
                nome,
                opcoes,
            });

            return {
                data: {
                    ok: true,
                    idempotente: false,
                    envioId: uuidHistorico,
                    status: "ENVIADO",
                    tipoModelo: "acesso_usuario_criado",
                    modeloVersao: 1,
                },
                error: null,
            };
        },
    },
};

await enviarAcessoUsuarioEmailService({
    supabase: supabaseReenvio,
    usuarioEmail: "usuario.teste@example.com",
    senhaTemporaria: senhaFicticia,
    permissoesSnapshot: snapshot,
    chaveIdempotencia: uuidEnvio,
    reenvioDeId: uuidReenvio,
});

assert.equal(
    chamadasReenvio[0]
        .opcoes
        .body
        .reenvioDeId,
    uuidReenvio
);

const erroEnvio = {
    context: {
        json: {
            codigo: "ENVIO_RECUSADO",
            erro: "Não foi possível entregar a comunicação de acesso.",
            envioId: uuidHistorico,
            status: "ERRO",
        },
    },
    message: "Edge Function returned a non-2xx status code",
};

await assert.rejects(
    () =>
        enviarAcessoUsuarioEmailService({
            supabase: {
                functions: {
                    invoke: async () => ({
                        data: null,
                        error: erroEnvio,
                    }),
                },
            },
            usuarioEmail: "usuario.teste@example.com",
            senhaTemporaria: senhaFicticia,
            permissoesSnapshot: snapshot,
            chaveIdempotencia: uuidEnvio,
        }),
    (error) => {
        assert.equal(
            error.message,
            "Não foi possível entregar a comunicação de acesso."
        );

        assert.equal(
            error.codigo,
            "ENVIO_RECUSADO"
        );

        assert.equal(
            error.envioId,
            uuidHistorico
        );

        assert.equal(
            error.statusEnvio,
            "ERRO"
        );

        return true;
    }
);

const chamadasRpc = [];

const supabaseHistorico = {
    rpc: async (
        nome,
        parametros
    ) => {
        chamadasRpc.push({
            nome,
            parametros,
        });

        return {
            data: [
                {
                    id: uuidHistorico,
                    usuario_permissao_id: null,
                    usuario_id: null,
                    usuario_email: "USUARIO.TESTE@EXAMPLE.COM",
                    usuario_nome: "Usuário Teste",
                    empresa_id: null,
                    empresa_nome: "Empresa Teste",
                    perfil_snapshot: "consulta",
                    permissoes_snapshot: snapshot,
                    modulos_liberados: [
                        "Dashboard SST",
                    ],
                    acoes_liberadas: [
                        "Visualizar",
                    ],
                    restricoes: [],
                    modelo_tipo: "acesso_usuario_criado",
                    modelo_versao: 1,
                    destinatario_email: "USUARIO.TESTE@EXAMPLE.COM",
                    remetente_nome: "SafeScan Brasil",
                    status: "ENVIADO",
                    chave_idempotencia: uuidEnvio,
                    tentativa_numero: 1,
                    reenvio_de_id: null,
                    provedor_mensagem_id: "mensagem-ficticia",
                    erro_codigo: null,
                    solicitado_por: null,
                    solicitado_por_email: "ADMIN@EXAMPLE.COM",
                    iniciado_em: "2026-09-07T15:00:00.000Z",
                    enviado_em: "2026-09-07T15:00:01.000Z",
                    criado_em: "2026-09-07T15:00:00.000Z",
                    atualizado_em: "2026-09-07T15:00:01.000Z",
                },
            ],
            error: null,
        };
    },
};

const historico =
    await listarHistoricoAcessoUsuarioEmailService({
        supabase: supabaseHistorico,
        usuarioEmail: " Usuario.Teste@Example.com ",
        limite: 25,
    });

assert.equal(
    chamadasRpc.length,
    1
);

assert.equal(
    chamadasRpc[0].nome,
    "admin_listar_acesso_usuario_email_envios"
);

assert.deepEqual(
    chamadasRpc[0].parametros,
    {
        p_usuario_id: null,
        p_usuario_email: "usuario.teste@example.com",
        p_limite: 25,
    }
);

assert.equal(
    historico.length,
    1
);

assert.equal(
    historico[0].usuarioEmail,
    "usuario.teste@example.com"
);

assert.equal(
    historico[0].status,
    "ENVIADO"
);

assert.equal(
    historico[0].tentativaNumero,
    1
);

assert.equal(
    historico[0].solicitadoPorEmail,
    "admin@example.com"
);

assert.equal(
    JSON.stringify(
        historico
    ).toLowerCase().includes(
        "senha"
    ),
    false,
    "Histórico normalizado não deve possuir campo de senha."
);

const historicoComMensagemLegada =
    normalizarRegistroHistoricoAcessoUsuarioEmail({
        id: uuidHistorico,
        status: "ERRO",
        tentativa_numero: 2,
        mensagem_erro: "ERRO_INTERNO",
    });

assert.equal(
    historicoComMensagemLegada.erroCodigo,
    "ERRO_INTERNO"
);

assert.equal(
    historicoComMensagemLegada.tentativaNumero,
    2
);

await assert.rejects(
    () =>
        listarHistoricoAcessoUsuarioEmailService({
            supabase: supabaseHistorico,
            limite: 0,
        }),
    /inteiro entre 1 e 200/
);

await assert.rejects(
    () =>
        enviarAcessoUsuarioEmailService({
            supabase: supabaseEnvio,
            usuarioEmail: "email-invalido",
            senhaTemporaria: senhaFicticia,
            permissoesSnapshot: snapshot,
            chaveIdempotencia: uuidEnvio,
        }),
    /e-mail válido/
);

await assert.rejects(
    () =>
        enviarAcessoUsuarioEmailService({
            supabase: supabaseEnvio,
            usuarioEmail: "usuario.teste@example.com",
            senhaTemporaria: "123",
            permissoesSnapshot: snapshot,
            chaveIdempotencia: uuidEnvio,
        }),
    /entre 6 e 200/
);

await assert.rejects(
    () =>
        enviarAcessoUsuarioEmailService({
            supabase: supabaseEnvio,
            usuarioEmail: "usuario.teste@example.com",
            senhaTemporaria: senhaFicticia,
            permissoesSnapshot: {},
            chaveIdempotencia: uuidEnvio,
        }),
    /Snapshot de permissões inválido/
);

const proibidosNoService = [
    "console.log",
    "console.info",
    "console.warn",
    "console.error",
    "localStorage",
    "sessionStorage",
    "admin-criar-login-app",
    ".from(\"acesso_usuario_email_envios\")",
    ".insert(",
    ".update(",
    ".delete(",
];

for (const proibido of proibidosNoService) {
    assert.equal(
        codigo.includes(
            proibido
        ),
        false,
        `Conteúdo proibido no adapter G6: ${proibido}`
    );
}

assert.ok(
    codigo.includes(
        'supabase.functions.invoke('
    )
);

assert.ok(
    codigo.includes(
        'supabase.rpc('
    )
);

assert.ok(
    codigo.includes(
        '"enviar-email-acesso-usuario"'
    )
);

assert.ok(
    codigo.includes(
        '"admin_listar_acesso_usuario_email_envios"'
    )
);

const inicioRetornoEnvio =
    codigo.indexOf(
        "return {\n        ok:"
    );

assert.ok(
    inicioRetornoEnvio >= 0,
    "Retorno seguro de envio não localizado."
);

const retornoEnvio =
    codigo.slice(
        inicioRetornoEnvio,
        codigo.indexOf(
            "\n    };",
            inicioRetornoEnvio
        ) + 7
    );

assert.equal(
    retornoEnvio.includes(
        "senha"
    ),
    false,
    "Retorno do envio não pode possuir senha."
);

process.stdout.write(
    [
        "ACESSO_EMAIL_G6M2_ADAPTER_SMOKE_OK",
        "INVOKE_EDGE_MOCK=OK",
        "HISTORICO_RPC_MOCK=OK",
        "UUID_IDEMPOTENCIA=OK",
        "REENVIO=OK",
        "ERRO_CONTROLADO=OK",
        "SENHA_NO_RETORNO=0",
        "SENHA_NO_HISTORICO_NORMALIZADO=0",
        "CONSOLE=0",
        "SUPABASE_REAL=NAO",
        "EMAIL_REAL=NAO",
    ].join("\n") + "\n"
);
