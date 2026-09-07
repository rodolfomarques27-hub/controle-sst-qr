import {
    ACOES_USUARIOS_PERMISSOES,
    MODULOS_USUARIOS_PERMISSOES,
    PERFIS_USUARIOS_PERMISSOES_PLANEJADOS,
} from "../constants/usuariosPermissoesConstants.js";

import {
    normalizarPerfilPermissaoSistema,
    normalizarPermissaoSistema,
    usuarioPodeExecutarAcaoSistema,
} from "./usuariosPermissoesSistemaService.js";

const VERSAO_SNAPSHOT_PERMISSOES_ACESSO = 1;

function normalizarTexto(valor) {
    return String(valor ?? "").trim();
}

function ehObjetoPlano(valor) {
    return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function listaUnicaTextos(valores = []) {
    const resultado = [];
    const encontrados = new Set();

    valores.forEach((valor) => {
        const texto = normalizarTexto(valor);

        if (!texto || encontrados.has(texto)) return;

        encontrados.add(texto);
        resultado.push(texto);
    });

    return resultado;
}

function obterPerfilConfigurado(perfisConfigurados = [], perfilChave = "") {
    const chave = normalizarTexto(perfilChave).toLowerCase();

    if (!chave || !Array.isArray(perfisConfigurados)) return null;

    return (
        perfisConfigurados
            .map((perfil) => normalizarPerfilPermissaoSistema(perfil))
            .find((perfil) => perfil?.chave === chave && perfil?.ativo !== false)
        || null
    );
}

function obterPerfilCatalogo(perfilChave = "") {
    const chave = normalizarTexto(perfilChave).toLowerCase();

    return (
        PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.find(
            (perfil) => perfil.chave === chave
        )
        || null
    );
}

function possuiPermissoesSalvas(permissoes = null) {
    return ehObjetoPlano(permissoes) && Object.keys(permissoes).length > 0;
}

function selecionarPermissaoParaAvaliacao({
    permissaoUsuario,
    perfilConfigurado,
}) {
    if (possuiPermissoesSalvas(permissaoUsuario.permissoes)) {
        return {
            permissaoAvaliacao: permissaoUsuario,
            origemPermissoes: "usuario_salvo",
        };
    }

    if (
        perfilConfigurado
        && possuiPermissoesSalvas(perfilConfigurado.permissoesJson)
    ) {
        return {
            permissaoAvaliacao: {
                ...permissaoUsuario,
                permissoes: perfilConfigurado.permissoesJson,
            },
            origemPermissoes: "perfil_editavel",
        };
    }

    return {
        permissaoAvaliacao: permissaoUsuario,
        origemPermissoes: "fallback_estatico",
    };
}

function construirMatrizPermissoes(permissaoAvaliacao) {
    const matriz = {};

    MODULOS_USUARIOS_PERMISSOES.forEach((modulo) => {
        const acoes = {};

        ACOES_USUARIOS_PERMISSOES.forEach((acao) => {
            const permitido = usuarioPodeExecutarAcaoSistema(
                permissaoAvaliacao,
                modulo.chave,
                acao.chave
            );

            if (permitido) {
                acoes[acao.chave] = true;
            }
        });

        matriz[modulo.chave] = acoes;
    });

    return matriz;
}

function obterModulosLiberados(matriz = {}) {
    return MODULOS_USUARIOS_PERMISSOES
        .filter((modulo) => {
            const acoes = matriz[modulo.chave];

            return ehObjetoPlano(acoes) && Object.keys(acoes).length > 0;
        })
        .map((modulo) => modulo.modulo);
}

function obterAcoesLiberadas(matriz = {}) {
    return ACOES_USUARIOS_PERMISSOES
        .filter((acao) => (
            MODULOS_USUARIOS_PERMISSOES.some(
                (modulo) => matriz?.[modulo.chave]?.[acao.chave] === true
            )
        ))
        .map((acao) => acao.acao);
}

function construirRestricoes({
    permissaoUsuario,
    matriz,
}) {
    if (
        permissaoUsuario.ativo !== true
        || permissaoUsuario.bloqueado === true
        || permissaoUsuario.perfil === "bloqueado"
    ) {
        return ["Acesso operacional bloqueado"];
    }

    const restricoesModulos =
        MODULOS_USUARIOS_PERMISSOES
            .filter((modulo) => {
                const acoes = matriz[modulo.chave];

                return !ehObjetoPlano(acoes) || Object.keys(acoes).length === 0;
            })
            .map(
                (modulo) => `Módulo não liberado: ${modulo.modulo}`
            );

    const restricoesAcoes =
        ACOES_USUARIOS_PERMISSOES
            .filter((acao) => (
                !MODULOS_USUARIOS_PERMISSOES.some(
                    (modulo) => matriz?.[modulo.chave]?.[acao.chave] === true
                )
            ))
            .map(
                (acao) => `Ação não liberada: ${acao.acao}`
            );

    return listaUnicaTextos([
        ...restricoesModulos,
        ...restricoesAcoes,
    ]);
}

export function comporPermissoesAcessoUsuarioEmail({
    permissaoUsuario,
    perfisConfigurados = [],
} = {}) {
    const permissaoNormalizada =
        normalizarPermissaoSistema(permissaoUsuario);

    if (!permissaoNormalizada) {
        throw new Error(
            "Permissão do usuário não informada para compor a comunicação de acesso."
        );
    }

    const perfilConfigurado =
        obterPerfilConfigurado(
            perfisConfigurados,
            permissaoNormalizada.perfil
        );

    const perfilCatalogo =
        obterPerfilCatalogo(
            permissaoNormalizada.perfil
        );

    const {
        permissaoAvaliacao,
        origemPermissoes,
    } =
        selecionarPermissaoParaAvaliacao({
            permissaoUsuario: permissaoNormalizada,
            perfilConfigurado,
        });

    const matriz =
        construirMatrizPermissoes(
            permissaoAvaliacao
        );

    const modulosLiberados =
        obterModulosLiberados(
            matriz
        );

    const acoesLiberadas =
        obterAcoesLiberadas(
            matriz
        );

    const restricoes =
        construirRestricoes({
            permissaoUsuario: permissaoNormalizada,
            matriz,
        });

    const perfilNome =
        normalizarTexto(
            perfilConfigurado?.nome
            || perfilCatalogo?.perfil
            || permissaoNormalizada.perfil.replace(/_/g, " ")
        );

    const permissoesSnapshot = {
        versao: VERSAO_SNAPSHOT_PERMISSOES_ACESSO,
        perfil: permissaoNormalizada.perfil,
        ativo: permissaoNormalizada.ativo === true,
        bloqueado: permissaoNormalizada.bloqueado === true,
        acesso_global: permissaoNormalizada.acesso_global === true,
        origem_perfil:
            perfilConfigurado
                ? "perfil_editavel"
                : "catalogo_estatico",
        origem_permissoes: origemPermissoes,
        modulos: matriz,
    };

    return {
        perfilChave: permissaoNormalizada.perfil,
        perfilNome,
        modulosLiberados,
        acoesLiberadas,
        restricoes,
        permissoesSnapshot,
    };
}

export function formatarListaPermissoesAcessoUsuarioEmail(
    valores = [],
    {
        valorVazio = "Nenhum",
    } = {}
) {
    const itens =
        listaUnicaTextos(
            Array.isArray(valores)
                ? valores
                : []
        );

    return itens.length > 0
        ? itens.join(", ")
        : valorVazio;
}

export function prepararDadosPermissoesAcessoUsuarioEmail({
    permissaoUsuario,
    perfisConfigurados = [],
} = {}) {
    const composicao =
        comporPermissoesAcessoUsuarioEmail({
            permissaoUsuario,
            perfisConfigurados,
        });

    const variaveisModelo = {
        perfil_nome:
            composicao.perfilNome,

        modulos_liberados:
            formatarListaPermissoesAcessoUsuarioEmail(
                composicao.modulosLiberados,
                {
                    valorVazio: "Nenhum módulo liberado",
                }
            ),

        acoes_liberadas:
            formatarListaPermissoesAcessoUsuarioEmail(
                composicao.acoesLiberadas,
                {
                    valorVazio: "Nenhuma ação liberada",
                }
            ),

        restricoes:
            formatarListaPermissoesAcessoUsuarioEmail(
                composicao.restricoes,
                {
                    valorVazio: "Nenhuma restrição adicional",
                }
            ),
    };

    return {
        ...composicao,
        variaveisModelo,
    };
}
