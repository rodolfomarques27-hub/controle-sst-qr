import assert from "node:assert/strict";

import {
    comporPermissoesAcessoUsuarioEmail,
    formatarListaPermissoesAcessoUsuarioEmail,
    prepararDadosPermissoesAcessoUsuarioEmail,
} from "../src/services/acessoUsuarioEmailPermissoesService.js";

import {
    ACOES_USUARIOS_PERMISSOES,
    MODULOS_USUARIOS_PERMISSOES,
    PERFIS_USUARIOS_PERMISSOES_PLANEJADOS,
} from "../src/constants/usuariosPermissoesConstants.js";

const perfilEditavelConsulta = {
    chave: "consulta",
    nome: "Consulta configurada",
    ativo: true,
    permissoes_json: {
        acessoTotal: false,
        modulos: {
            dashboard_sst: {
                visualizar: true,
            },
            nova_auditoria: {
                visualizar: true,
                cadastrar: true,
            },
        },
        acoesCriticas: {},
    },
};

const usuarioSemMapaSalvo = {
    perfil: "consulta",
    ativo: true,
    bloqueado: false,
    acesso_global: false,
    permissoes: {},
};

const resultadoPerfilEditavel =
    comporPermissoesAcessoUsuarioEmail({
        permissaoUsuario: usuarioSemMapaSalvo,
        perfisConfigurados: [
            perfilEditavelConsulta,
        ],
    });

assert.equal(
    resultadoPerfilEditavel.perfilChave,
    "consulta"
);

assert.equal(
    resultadoPerfilEditavel.perfilNome,
    "Consulta configurada"
);

assert.equal(
    resultadoPerfilEditavel.permissoesSnapshot.origem_permissoes,
    "perfil_editavel"
);

assert.equal(
    resultadoPerfilEditavel.permissoesSnapshot.origem_perfil,
    "perfil_editavel"
);

assert.ok(
    resultadoPerfilEditavel.modulosLiberados.includes(
        "Dashboard SST"
    )
);

assert.ok(
    resultadoPerfilEditavel.modulosLiberados.includes(
        "Nova Auditoria"
    )
);

assert.ok(
    resultadoPerfilEditavel.acoesLiberadas.includes(
        "Visualizar"
    )
);

assert.ok(
    resultadoPerfilEditavel.acoesLiberadas.includes(
        "Cadastrar"
    )
);

const usuarioComMapaSalvo = {
    perfil: "consulta",
    ativo: true,
    bloqueado: false,
    acesso_global: false,
    permissoes: {
        acessoTotal: false,
        modulos: {
            qr_code: {
                visualizar: true,
                exportar: true,
            },
        },
        acoesCriticas: {},
    },
};

const usuarioComMapaAntes =
    JSON.stringify(
        usuarioComMapaSalvo
    );

const resultadoUsuarioSalvo =
    comporPermissoesAcessoUsuarioEmail({
        permissaoUsuario: usuarioComMapaSalvo,
        perfisConfigurados: [
            perfilEditavelConsulta,
        ],
    });

assert.equal(
    resultadoUsuarioSalvo.permissoesSnapshot.origem_permissoes,
    "usuario_salvo"
);

assert.ok(
    resultadoUsuarioSalvo.modulosLiberados.includes(
        "QR Code"
    )
);

assert.ok(
    resultadoUsuarioSalvo.acoesLiberadas.includes(
        "Exportar"
    )
);

assert.equal(
    JSON.stringify(
        usuarioComMapaSalvo
    ),
    usuarioComMapaAntes
);

const usuarioBloqueado = {
    perfil: "bloqueado",
    ativo: false,
    bloqueado: true,
    acesso_global: false,
    permissoes: {
        acessoTotal: false,
        modulos: {
            qr_code: {
                visualizar: true,
            },
        },
        acoesCriticas: {},
    },
};

const resultadoBloqueado =
    comporPermissoesAcessoUsuarioEmail({
        permissaoUsuario: usuarioBloqueado,
    });

assert.equal(
    resultadoBloqueado.modulosLiberados.length,
    0
);

assert.equal(
    resultadoBloqueado.acoesLiberadas.length,
    0
);

assert.deepEqual(
    resultadoBloqueado.restricoes,
    [
        "Acesso operacional bloqueado",
    ]
);

const usuarioAcessoTotal = {
    perfil: "consulta",
    ativo: true,
    bloqueado: false,
    acesso_global: false,
    permissoes: {
        acessoTotal: true,
        modulos: {},
        acoesCriticas: {},
    },
};

const resultadoAcessoTotal =
    comporPermissoesAcessoUsuarioEmail({
        permissaoUsuario: usuarioAcessoTotal,
    });

assert.equal(
    resultadoAcessoTotal.modulosLiberados.length,
    MODULOS_USUARIOS_PERMISSOES.length
);

assert.equal(
    resultadoAcessoTotal.acoesLiberadas.length,
    ACOES_USUARIOS_PERMISSOES.length
);

assert.equal(
    resultadoAcessoTotal.restricoes.length,
    0
);

assert.equal(
    formatarListaPermissoesAcessoUsuarioEmail([
        "Visualizar",
        "Visualizar",
        "Exportar",
    ]),
    "Visualizar, Exportar"
);

assert.equal(
    formatarListaPermissoesAcessoUsuarioEmail([]),
    "Nenhum"
);

const snapshotSerializado =
    JSON.stringify(
        resultadoUsuarioSalvo.permissoesSnapshot
    ).toLowerCase();

const termosSensiveis = [
    "senha",
    "password",
    "passcode",
    "token",
    "credential",
    "credencial",
    "secret",
    "segredo",
];

termosSensiveis.forEach((termo) => {
    assert.equal(
        snapshotSerializado.includes(termo),
        false
    );
});

const dadosVariaveisConsulta =
    prepararDadosPermissoesAcessoUsuarioEmail({
        permissaoUsuario: usuarioSemMapaSalvo,
        perfisConfigurados: [
            perfilEditavelConsulta,
        ],
    });

assert.deepEqual(
    Object.keys(
        dadosVariaveisConsulta.variaveisModelo
    ).sort(),
    [
        "acoes_liberadas",
        "modulos_liberados",
        "perfil_nome",
        "restricoes",
    ].sort()
);

assert.equal(
    dadosVariaveisConsulta.variaveisModelo.perfil_nome,
    "Consulta configurada"
);

assert.ok(
    dadosVariaveisConsulta.variaveisModelo.modulos_liberados.includes(
        "Dashboard SST"
    )
);

assert.ok(
    dadosVariaveisConsulta.variaveisModelo.modulos_liberados.includes(
        "Nova Auditoria"
    )
);

assert.ok(
    dadosVariaveisConsulta.variaveisModelo.acoes_liberadas.includes(
        "Visualizar"
    )
);

assert.ok(
    dadosVariaveisConsulta.variaveisModelo.acoes_liberadas.includes(
        "Cadastrar"
    )
);

const dadosVariaveisBloqueado =
    prepararDadosPermissoesAcessoUsuarioEmail({
        permissaoUsuario: usuarioBloqueado,
    });

assert.equal(
    dadosVariaveisBloqueado.variaveisModelo.modulos_liberados,
    "Nenhum módulo liberado"
);

assert.equal(
    dadosVariaveisBloqueado.variaveisModelo.acoes_liberadas,
    "Nenhuma ação liberada"
);

assert.equal(
    dadosVariaveisBloqueado.variaveisModelo.restricoes,
    "Acesso operacional bloqueado"
);

PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.forEach(
    (perfilCatalogo) => {
        const estaBloqueado =
            perfilCatalogo.chave === "bloqueado";

        const dadosPerfil =
            prepararDadosPermissoesAcessoUsuarioEmail({
                permissaoUsuario: {
                    perfil: perfilCatalogo.chave,
                    ativo: !estaBloqueado,
                    bloqueado: estaBloqueado,
                    acesso_global: false,
                    permissoes: {},
                },
            });

        assert.equal(
            dadosPerfil.perfilChave,
            perfilCatalogo.chave
        );

        assert.equal(
            dadosPerfil.perfilNome,
            perfilCatalogo.perfil
        );

        assert.equal(
            typeof dadosPerfil.variaveisModelo.perfil_nome,
            "string"
        );

        assert.equal(
            typeof dadosPerfil.variaveisModelo.modulos_liberados,
            "string"
        );

        assert.equal(
            typeof dadosPerfil.variaveisModelo.acoes_liberadas,
            "string"
        );

        assert.equal(
            typeof dadosPerfil.variaveisModelo.restricoes,
            "string"
        );

        if (estaBloqueado) {
            assert.equal(
                dadosPerfil.modulosLiberados.length,
                0
            );

            assert.equal(
                dadosPerfil.acoesLiberadas.length,
                0
            );
        } else {
            assert.ok(
                dadosPerfil.modulosLiberados.length > 0
            );

            assert.ok(
                dadosPerfil.acoesLiberadas.length > 0
            );
        }
    }
);

const serializacaoDadosVariaveis =
    JSON.stringify(
        dadosVariaveisConsulta
    ).toLowerCase();

[
    "senha",
    "password",
    "passcode",
    "token",
    "credential",
    "credencial",
    "secret",
    "segredo",
].forEach((termo) => {
    assert.equal(
        serializacaoDadosVariaveis.includes(
            termo
        ),
        false
    );
});

assert.deepEqual(
    dadosVariaveisConsulta.permissoesSnapshot,
    resultadoPerfilEditavel.permissoesSnapshot
);

process.stdout.write(
    "ACESSO_EMAIL_G4M1_SMOKE_OK\n"
);

process.stdout.write(
    "ACESSO_EMAIL_G4M2_VARIAVEIS_OK\n"
);
