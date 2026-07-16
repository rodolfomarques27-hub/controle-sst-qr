import assert from "node:assert/strict";
import {
    proximoCodigoExtintor,
    TIPOS_EXTINTORES_BRASIL,
} from "../src/services/extintoresVistoriaService.js";
import {
    ACOES_PERMISSAO_SISTEMA,
    MODULOS_PERMISSAO_SISTEMA,
    usuarioPodeExecutarAcaoSistema,
} from "../src/services/usuariosPermissoesSistemaService.js";

const codigo = proximoCodigoExtintor([
    { codigo: "E-001" },
    { codigo: "E-002" },
    { codigo: "E-004" },
]);

assert.equal(codigo, "E-03", "O cadastro deve reutilizar o primeiro código disponível.");
assert.equal(proximoCodigoExtintor([]), "E-01");
assert.ok(TIPOS_EXTINTORES_BRASIL.some((tipo) => tipo.valor === "CO2"));
assert.ok(TIPOS_EXTINTORES_BRASIL.some((tipo) => tipo.valor === "PQS ABC"));

const usuarioConsulta = { perfil: "consulta", ativo: true, bloqueado: false };
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        usuarioConsulta,
        MODULOS_PERMISSAO_SISTEMA.DASHBOARD_SST,
        ACOES_PERMISSAO_SISTEMA.VISUALIZAR
    ),
    true,
    "Consulta deve visualizar o dashboard."
);
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        usuarioConsulta,
        MODULOS_PERMISSAO_SISTEMA.EMPRESAS,
        ACOES_PERMISSAO_SISTEMA.EDITAR
    ),
    false,
    "Consulta não deve editar empresas."
);
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        { perfil: "administrador", ativo: true, bloqueado: false },
        MODULOS_PERMISSAO_SISTEMA.EMPRESAS,
        ACOES_PERMISSAO_SISTEMA.EDITAR
    ),
    true,
    "Administrador deve editar empresas."
);
assert.equal(
    usuarioPodeExecutarAcaoSistema(
        { perfil: "administrador", ativo: false, bloqueado: true },
        MODULOS_PERMISSAO_SISTEMA.EMPRESAS,
        ACOES_PERMISSAO_SISTEMA.EDITAR
    ),
    false,
    "Usuário bloqueado não deve executar ações."
);

console.log("Smoke test aprovado: regras básicas de extintores.");
