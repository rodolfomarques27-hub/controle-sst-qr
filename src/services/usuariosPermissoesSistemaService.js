const PERMISSAO_SISTEMA_PADRAO_SEGURA = {
    id: null,
    user_id: null,
    email: "",
    nome: "",
    funcao: "",
    empresa: "",
    foto_url: "",
    perfil: "consulta",
    ativo: false,
    bloqueado: true,
    acesso_global: false,
    permissoes: {},
    observacao: "",
    precisa_trocar_senha: false,
    ultimo_login_em: null,
    login_criado_em: null,
    criado_por: null,
    atualizado_por: null,
    excluido: false,
    excluido_em: null,
    excluido_por: null,
    created_at: null,
    updated_at: null,
};

const PERFIS_PERMISSAO_SISTEMA_VALIDOS = new Set([
    "administrador",
    "tecnico_sst",
    "auditor",
    "gestor",
    "consulta",
    "bloqueado",
]);

function normalizarBooleano(valor) {
    return valor === true || valor === "true";
}

function normalizarTexto(valor) {
    return String(valor || "").trim();
}

function normalizarEmail(valor) {
    return normalizarTexto(valor).toLowerCase();
}

function normalizarPerfilSistema(valor) {
    const perfil = normalizarTexto(valor || "consulta").toLowerCase();

    if (perfil === "admin") return "administrador";
    if (perfil === "técnico sst" || perfil === "tecnico sst") return "tecnico_sst";
    if (perfil === "técnico de segurança" || perfil === "tecnico de seguranca") return "tecnico_sst";

    return PERFIS_PERMISSAO_SISTEMA_VALIDOS.has(perfil) ? perfil : "consulta";
}

export function normalizarPermissaoSistema(permissao = null) {
    if (!permissao) return null;

    return {
        ...PERMISSAO_SISTEMA_PADRAO_SEGURA,
        ...permissao,
        email: normalizarEmail(permissao.email),
        nome: permissao.nome || "",
        funcao: permissao.funcao || "",
        empresa: permissao.empresa || "",
        foto_url: permissao.foto_url || permissao.fotoUrl || permissao.avatar_url || permissao.avatarUrl || "",
        perfil: normalizarPerfilSistema(permissao.perfil),
        ativo: normalizarBooleano(permissao.ativo),
        bloqueado: normalizarBooleano(permissao.bloqueado),
        acesso_global: normalizarBooleano(permissao.acesso_global),
        permissoes: permissao.permissoes && typeof permissao.permissoes === "object" ? permissao.permissoes : {},
        observacao: permissao.observacao || "",
        precisa_trocar_senha: normalizarBooleano(permissao.precisa_trocar_senha),
        ultimo_login_em: permissao.ultimo_login_em || null,
        login_criado_em: permissao.login_criado_em || null,
        criado_por: permissao.criado_por || null,
        atualizado_por: permissao.atualizado_por || null,
        excluido: normalizarBooleano(permissao.excluido),
        excluido_em: permissao.excluido_em || null,
        excluido_por: permissao.excluido_por || null,
    };
}


const PERFIL_PERMISSAO_EDITAVEL_PADRAO = {
    id: null,
    chave: "",
    nome: "",
    perfil: "",
    descricao: "",
    nivel: "",
    resumo: "",
    modulosLiberados: [],
    acoesLiberadas: [],
    acoesRestritas: [],
    permissoesJson: {},
    observacao: "",
    ativo: true,
    editavel: true,
    padraoSistema: {},
    atualizado_por: null,
    created_at: null,
    updated_at: null,
};

function normalizarArrayJson(valor) {
    if (Array.isArray(valor)) return valor.filter((item) => normalizarTexto(item));
    if (typeof valor === "string") {
        try {
            const convertido = JSON.parse(valor);
            return Array.isArray(convertido) ? convertido.filter((item) => normalizarTexto(item)) : [];
        } catch {
            return [];
        }
    }

    return [];
}

function normalizarObjetoJson(valor) {
    if (valor && typeof valor === "object" && !Array.isArray(valor)) return valor;
    if (typeof valor === "string") {
        try {
            const convertido = JSON.parse(valor);
            return convertido && typeof convertido === "object" && !Array.isArray(convertido) ? convertido : {};
        } catch {
            return {};
        }
    }

    return {};
}

export function normalizarPerfilPermissaoSistema(perfil = null) {
    if (!perfil) return null;

    const chave = normalizarPerfilSistema(perfil.chave || perfil.perfil || "consulta");
    const nome = normalizarTexto(perfil.nome || perfil.perfil || chave.replace(/_/g, " "));

    return {
        ...PERFIL_PERMISSAO_EDITAVEL_PADRAO,
        ...perfil,
        chave,
        nome,
        perfil: nome,
        descricao: normalizarTexto(perfil.descricao),
        nivel: normalizarTexto(perfil.nivel),
        resumo: normalizarTexto(perfil.resumo),
        modulosLiberados: normalizarArrayJson(perfil.modulos_liberados ?? perfil.modulosLiberados),
        acoesLiberadas: normalizarArrayJson(perfil.acoes_liberadas ?? perfil.acoesLiberadas),
        acoesRestritas: normalizarArrayJson(perfil.acoes_restritas ?? perfil.acoesRestritas),
        permissoesJson: normalizarObjetoJson(perfil.permissoes_json ?? perfil.permissoesJson),
        observacao: normalizarTexto(perfil.observacao),
        ativo: normalizarBooleano(perfil.ativo ?? true),
        editavel: normalizarBooleano(perfil.editavel ?? true),
        padraoSistema: normalizarObjetoJson(perfil.padrao_sistema ?? perfil.padraoSistema),
        atualizado_por: perfil.atualizado_por || null,
        created_at: perfil.created_at || null,
        updated_at: perfil.updated_at || null,
    };
}

function validarPerfilPermissaoSistema(perfil = {}) {
    const chave = normalizarPerfilSistema(perfil.chave || perfil.perfil);
    const nome = normalizarTexto(perfil.nome || perfil.perfil);
    const descricao = normalizarTexto(perfil.descricao);
    const nivel = normalizarTexto(perfil.nivel);
    const resumo = normalizarTexto(perfil.resumo);
    const observacao = normalizarTexto(perfil.observacao);
    const modulosLiberados = normalizarArrayJson(perfil.modulosLiberados ?? perfil.modulos_liberados);
    const acoesLiberadas = normalizarArrayJson(perfil.acoesLiberadas ?? perfil.acoes_liberadas);
    const acoesRestritas = normalizarArrayJson(perfil.acoesRestritas ?? perfil.acoes_restritas);
    const permissoesJson = normalizarObjetoJson(perfil.permissoesJson ?? perfil.permissoes_json);

    if (!chave) {
        throw new Error("Perfil não informado para salvar o padrão de permissões.");
    }

    if (!nome) {
        throw new Error("Informe o nome do perfil padrão.");
    }

    return {
        chave,
        nome,
        descricao,
        nivel,
        resumo,
        modulosLiberados,
        acoesLiberadas,
        acoesRestritas,
        permissoesJson,
        observacao,
        ativo: normalizarBooleano(perfil.ativo ?? true),
        editavel: normalizarBooleano(perfil.editavel ?? true),
    };
}

export async function listarPerfisPermissoesSistemaService({ supabase }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para listar perfis padrão.");
    }

    const { data, error } = await supabase.rpc("admin_listar_perfis_permissoes_sistema");

    if (error) {
        throw new Error(error.message || "Erro ao listar perfis padrão editáveis.");
    }

    const perfis = Array.isArray(data) ? data : [];

    return perfis.map((perfil) => normalizarPerfilPermissaoSistema(perfil)).filter(Boolean);
}

export async function salvarPerfilPermissaoSistemaService({ supabase, perfil }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para salvar perfil padrão.");
    }

    const dados = validarPerfilPermissaoSistema(perfil);

    const { data, error } = await supabase.rpc("admin_salvar_perfil_permissao_sistema", {
        p_chave: dados.chave,
        p_nome: dados.nome,
        p_descricao: dados.descricao,
        p_nivel: dados.nivel,
        p_resumo: dados.resumo,
        p_modulos_liberados: dados.modulosLiberados,
        p_acoes_liberadas: dados.acoesLiberadas,
        p_acoes_restritas: dados.acoesRestritas,
        p_permissoes_json: dados.permissoesJson,
        p_observacao: dados.observacao,
        p_ativo: dados.ativo,
        p_editavel: dados.editavel,
    });

    if (error) {
        throw new Error(error.message || "Erro ao salvar perfil padrão editável.");
    }

    const perfilSalvo = Array.isArray(data) ? data[0] : data;

    return normalizarPerfilPermissaoSistema(perfilSalvo || null);
}

export async function restaurarPerfilPermissaoSistemaService({ supabase, chave }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para restaurar perfil padrão.");
    }

    const chaveTratada = normalizarPerfilSistema(chave);

    if (!chaveTratada) {
        throw new Error("Perfil não informado para restaurar o padrão original.");
    }

    const { data, error } = await supabase.rpc("admin_restaurar_perfil_permissao_sistema", {
        p_chave: chaveTratada,
    });

    if (error) {
        throw new Error(error.message || "Erro ao restaurar perfil padrão.");
    }

    const perfilRestaurado = Array.isArray(data) ? data[0] : data;

    return normalizarPerfilPermissaoSistema(perfilRestaurado || null);
}

export async function aplicarPerfilPermissaoUsuariosSistemaService({ supabase, chave, confirmacao }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para aplicar perfil aos usuários existentes.");
    }

    const chaveTratada = normalizarPerfilSistema(chave);
    const confirmacaoTratada = normalizarTexto(confirmacao);

    if (!chaveTratada) {
        throw new Error("Perfil não informado para aplicar aos usuários existentes.");
    }

    if (!confirmacaoTratada) {
        throw new Error("Confirmação obrigatória para aplicar o perfil aos usuários existentes.");
    }

    const { data, error } = await supabase.rpc("admin_aplicar_perfil_permissao_usuarios_sistema", {
        p_chave: chaveTratada,
        p_confirmacao: confirmacaoTratada,
    });

    if (error) {
        throw new Error(error.message || "Erro ao aplicar perfil aos usuários existentes.");
    }

    const resultado = Array.isArray(data) ? data[0] : data;

    return {
        perfil: resultado?.perfil || chaveTratada,
        usuariosAtualizados: Number(resultado?.usuarios_atualizados || resultado?.usuariosAtualizados || 0),
        updatedAt: resultado?.updated_at || resultado?.updatedAt || null,
    };
}

function validarDadosUsuarioPermissaoSistema(usuario = {}) {
    const email = normalizarEmail(usuario.email);
    const nome = normalizarTexto(usuario.nome);
    const funcao = normalizarTexto(usuario.funcao);
    const empresa = normalizarTexto(usuario.empresa);
    const fotoUrl = normalizarTexto(usuario.foto_url || usuario.fotoUrl);
    const perfil = normalizarPerfilSistema(usuario.perfil);
    const observacao = normalizarTexto(usuario.observacao);

    if (!email || !email.includes("@")) {
        throw new Error("Informe um e-mail válido para cadastrar a permissão do usuário.");
    }

    const bloqueado = perfil === "bloqueado" ? true : normalizarBooleano(usuario.bloqueado);
    const ativo = perfil === "bloqueado" ? false : normalizarBooleano(usuario.ativo ?? true);
    const acessoGlobal = perfil === "administrador" ? normalizarBooleano(usuario.acesso_global) : false;

    return {
        email,
        nome,
        funcao,
        empresa,
        fotoUrl,
        perfil,
        ativo,
        bloqueado,
        acessoGlobal,
        observacao,
    };
}


function validarAlteracaoSeguraPermissaoPropria({ usuarioAlvo = {}, usuarioAtual = null, dadosValidados = null } = {}) {
    const emailAlvo = normalizarEmail(dadosValidados?.email || usuarioAlvo?.email);
    const emailAtual = normalizarEmail(usuarioAtual?.email);

    if (!emailAlvo || !emailAtual || emailAlvo !== emailAtual) return;

    const permissaoAtual = normalizarPermissaoSistema(usuarioAtual);
    const usuarioAtualGerenciaPermissoes = usuarioPodeGerenciarPermissoesSistema(permissaoAtual);

    if (!usuarioAtualGerenciaPermissoes) return;

    const permissaoProjetada = normalizarPermissaoSistema({
        ...permissaoAtual,
        ...usuarioAlvo,
        email: emailAlvo,
        perfil: dadosValidados?.perfil ?? usuarioAlvo?.perfil,
        ativo: dadosValidados?.ativo ?? usuarioAlvo?.ativo,
        bloqueado: dadosValidados?.bloqueado ?? usuarioAlvo?.bloqueado,
        acesso_global: dadosValidados?.acessoGlobal ?? usuarioAlvo?.acesso_global,
        permissoes: usuarioAlvo?.permissoes || permissaoAtual?.permissoes || {},
    });

    const usuarioContinuariaGerenciandoPermissoes = usuarioPodeGerenciarPermissoesSistema(permissaoProjetada);

    if (!usuarioContinuariaGerenciandoPermissoes) {
        throw new Error("Você não pode remover o próprio acesso administrativo às Configurações. Peça para outro administrador fazer essa alteração.");
    }
}

function obterFotoPermissaoSistema(permissao = null) {
    return normalizarTexto(
        permissao?.foto_url
        || permissao?.fotoUrl
        || permissao?.avatar_url
        || permissao?.avatarUrl
        || permissao?.picture
        || ""
    );
}
export async function carregarPermissaoSistemaAtualService({ supabase }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para carregar permissões do sistema.");
    }

    const { data, error } = await supabase.rpc("usuario_permissao_sistema_atual");

    if (error) {
        throw new Error(error.message || "Erro ao carregar permissões do usuário no sistema.");
    }

    const permissao = Array.isArray(data) ? data[0] : data;
    const permissaoNormalizada = normalizarPermissaoSistema(permissao || null);

    if (!permissaoNormalizada || obterFotoPermissaoSistema(permissaoNormalizada)) {
        return permissaoNormalizada;
    }

    try {
        const { data: usuarios, error: erroUsuarios } = await supabase.rpc("admin_listar_usuarios_permissoes_sistema");

        if (!erroUsuarios && Array.isArray(usuarios)) {
            const emailAtual = normalizarEmail(permissaoNormalizada.email);
            const usuarioComFoto = usuarios.find((usuario) =>
                normalizarEmail(usuario?.email) === emailAtual
                && obterFotoPermissaoSistema(usuario)
            );

            const usuarioComFotoNormalizado = normalizarPermissaoSistema(usuarioComFoto || null);
            const fotoUsuarioComFoto = obterFotoPermissaoSistema(usuarioComFotoNormalizado);

            if (fotoUsuarioComFoto) {
                return {
                    ...permissaoNormalizada,
                    foto_url: permissaoNormalizada.foto_url || usuarioComFotoNormalizado?.foto_url || fotoUsuarioComFoto,
                    fotoUrl: permissaoNormalizada.fotoUrl || usuarioComFotoNormalizado?.fotoUrl || usuarioComFotoNormalizado?.foto_url || fotoUsuarioComFoto,
                    avatar_url: permissaoNormalizada.avatar_url || usuarioComFotoNormalizado?.avatar_url || usuarioComFotoNormalizado?.avatarUrl || "",
                    avatarUrl: permissaoNormalizada.avatarUrl || usuarioComFotoNormalizado?.avatarUrl || usuarioComFotoNormalizado?.avatar_url || "",
                };
            }
        }
    } catch {
        // Mantem a permissao atual se a listagem administrativa nao estiver disponivel.
    }

    return permissaoNormalizada;
}
export async function listarUsuariosPermissoesSistemaService({ supabase }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para listar usuários e permissões do sistema.");
    }

    const { data, error } = await supabase.rpc("admin_listar_usuarios_permissoes_sistema");

    if (error) {
        throw new Error(error.message || "Erro ao listar usuários e permissões do sistema.");
    }

    const usuarios = Array.isArray(data) ? data : [];

    return usuarios.map((usuario) => normalizarPermissaoSistema(usuario)).filter(Boolean);
}

export async function salvarUsuarioPermissaoSistemaService({ supabase, usuario, usuarioAtual = null }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para salvar usuário e permissão do sistema.");
    }

    const dados = validarDadosUsuarioPermissaoSistema(usuario);
    validarAlteracaoSeguraPermissaoPropria({
        usuarioAlvo: usuario,
        usuarioAtual,
        dadosValidados: dados,
    });

    const { data, error } = await supabase.rpc("admin_salvar_usuario_permissao_sistema", {
        p_email: dados.email,
        p_nome: dados.nome,
        p_funcao: dados.funcao,
        p_empresa: dados.empresa,
        p_foto_url: dados.fotoUrl,
        p_perfil: dados.perfil,
        p_ativo: dados.ativo,
        p_bloqueado: dados.bloqueado,
        p_acesso_global: dados.acessoGlobal,
        p_observacao: dados.observacao,
    });

    if (error) {
        throw new Error(error.message || "Erro ao salvar usuário e permissão do sistema.");
    }

    const permissaoSalva = Array.isArray(data) ? data[0] : data;

    return normalizarPermissaoSistema(permissaoSalva || null);
}

export async function excluirUsuarioPermissaoSistemaService({ supabase, usuario, usuarioAtual = null, observacao = "" }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para excluir acesso do app.");
    }

    const email = normalizarEmail(usuario?.email);
    const id = usuario?.id || null;
    const emailAtual = normalizarEmail(usuarioAtual?.email);

    if (!email && !id) {
        throw new Error("Informe o usuário que terá o acesso excluído.");
    }

    if (email && emailAtual && email === emailAtual) {
        throw new Error("Você não pode excluir o próprio acesso. Use outro administrador para essa ação.");
    }

    const { data, error } = await supabase.rpc("admin_excluir_usuario_permissao_sistema", {
        p_id: id,
        p_email: email,
        p_observacao: normalizarTexto(observacao),
    });

    if (error) {
        throw new Error(error.message || "Erro ao excluir acesso do app.");
    }

    const permissaoExcluida = Array.isArray(data) ? data[0] : data;

    return normalizarPermissaoSistema(permissaoExcluida || null);
}

export async function usuarioTemPermissaoSistemaService({ supabase, modulo, acao }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para validar permissão do sistema.");
    }

    const moduloTratado = normalizarTexto(modulo);
    const acaoTratada = normalizarTexto(acao);

    if (!moduloTratado || !acaoTratada) return false;

    const { data, error } = await supabase.rpc("usuario_tem_permissao_sistema", {
        modulo: moduloTratado,
        acao: acaoTratada,
    });

    if (error) {
        throw new Error(error.message || "Erro ao validar permissão do usuário no sistema.");
    }

    return Boolean(data);
}

export function permissaoSistemaTemAcessoGlobal(permissao = null) {
    return Boolean(permissao?.ativo && !permissao?.bloqueado && permissao?.acesso_global);
}

export const MODULOS_PERMISSAO_SISTEMA = Object.freeze({
    DASHBOARD_SST: "dashboard_sst",
    EMPRESAS: "empresas",
    COLABORADORES: "colaboradores",
    TREINAMENTOS: "treinamentos",
    QR_CODE: "qr_code",
    DASHBOARD_AUDITORIA: "dashboard_auditoria",
    NOVA_AUDITORIA: "nova_auditoria",
    AUDITORIA_SISTEMA: "auditoria_sistema",
    ACESSOS_APP: "acessos_app",
    CONFIGURACOES: "configuracoes",
    STORAGE: "storage",
    RELATORIOS: "relatorios",
    VISTORIA_VISUALIZAR: "vistoria_visualizar",
    VISTORIA_EDITAR: "vistoria_editar",
    MAPA_OBRA_ADMINISTRACAO: "mapa_obra_administracao",
    MAPA_OBRA_VISUALIZACAO: "mapa_obra_visualizacao",
});

export const ACOES_PERMISSAO_SISTEMA = Object.freeze({
    VISUALIZAR: "visualizar",
    CADASTRAR: "cadastrar",
    EDITAR: "editar",
    EXCLUIR: "excluir",
    UPLOAD: "upload",
    EXPORTAR: "exportar",
    LIMPAR_ARQUIVOS: "limpar_arquivos",
    GERENCIAR_PERMISSOES: "gerenciar_permissoes",
});

export const ACOES_CRITICAS_PERMISSAO_SISTEMA = Object.freeze({
    EXCLUIR: "excluir",
    LIMPAR_ARQUIVOS: "limpar_arquivos",
    GERENCIAR_PERMISSOES: "gerenciar_permissoes",
    CONFIGURACOES_CRITICAS: "configuracoes_criticas",
});

const METADADOS_ACOES_CRITICAS_PERMISSAO_SISTEMA = Object.freeze({
    [ACOES_CRITICAS_PERMISSAO_SISTEMA.EXCLUIR]: {
        moduloPadrao: MODULOS_PERMISSAO_SISTEMA.EMPRESAS,
        acaoPadrao: ACOES_PERMISSAO_SISTEMA.EXCLUIR,
        rotulo: "Excluir registros",
        mensagem: "Sem permissão para excluir registros.",
    },
    [ACOES_CRITICAS_PERMISSAO_SISTEMA.LIMPAR_ARQUIVOS]: {
        moduloPadrao: MODULOS_PERMISSAO_SISTEMA.STORAGE,
        acaoPadrao: ACOES_PERMISSAO_SISTEMA.LIMPAR_ARQUIVOS,
        rotulo: "Limpar arquivos",
        mensagem: "Sem permissão para limpar arquivos do Storage.",
    },
    [ACOES_CRITICAS_PERMISSAO_SISTEMA.GERENCIAR_PERMISSOES]: {
        moduloPadrao: MODULOS_PERMISSAO_SISTEMA.ACESSOS_APP,
        acaoPadrao: ACOES_PERMISSAO_SISTEMA.GERENCIAR_PERMISSOES,
        rotulo: "Gerenciar permissões",
        mensagem: "Sem permissão para gerenciar usuários e permissões.",
    },
    [ACOES_CRITICAS_PERMISSAO_SISTEMA.CONFIGURACOES_CRITICAS]: {
        moduloPadrao: MODULOS_PERMISSAO_SISTEMA.CONFIGURACOES,
        acaoPadrao: ACOES_PERMISSAO_SISTEMA.EDITAR,
        rotulo: "Alterar configurações críticas",
        mensagem: "Sem permissão para alterar configurações críticas do sistema.",
    },
});

function obterPermissoesSistema(permissao = null) {
    const permissaoNormalizada = normalizarPermissaoSistema(permissao);
    return permissaoNormalizada?.permissoes && typeof permissaoNormalizada.permissoes === "object"
        ? permissaoNormalizada.permissoes
        : {};
}

function permissaoSistemaEstaOperacional(permissao = null) {
    const permissaoNormalizada = normalizarPermissaoSistema(permissao);
    return Boolean(permissaoNormalizada?.ativo && !permissaoNormalizada?.bloqueado);
}

function obterValorPermissaoJson(valor) {
    return valor === true || valor === "true";
}

function usuarioTemAcaoCriticaNoJson(permissao = null, acaoCritica = "") {
    const chaveAcaoCritica = normalizarTexto(acaoCritica);
    if (!chaveAcaoCritica) return false;

    const permissoes = obterPermissoesSistema(permissao);
    const acoesCriticas = permissoes.acoesCriticas && typeof permissoes.acoesCriticas === "object"
        ? permissoes.acoesCriticas
        : {};

    return obterValorPermissaoJson(acoesCriticas[chaveAcaoCritica]);
}

const PERMISSOES_PADRAO_OPERACIONAIS_POR_PERFIL = Object.freeze({
    administrador: {
        todos: true,
    },
    tecnico_sst: {
        modulos: {
            [MODULOS_PERMISSAO_SISTEMA.DASHBOARD_SST]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.EMPRESAS]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.CADASTRAR, ACOES_PERMISSAO_SISTEMA.EDITAR, ACOES_PERMISSAO_SISTEMA.UPLOAD, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.COLABORADORES]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.CADASTRAR, ACOES_PERMISSAO_SISTEMA.EDITAR, ACOES_PERMISSAO_SISTEMA.UPLOAD, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.TREINAMENTOS]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.CADASTRAR, ACOES_PERMISSAO_SISTEMA.EDITAR, ACOES_PERMISSAO_SISTEMA.UPLOAD, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.QR_CODE]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.DASHBOARD_AUDITORIA]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.NOVA_AUDITORIA]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.CADASTRAR, ACOES_PERMISSAO_SISTEMA.EDITAR, ACOES_PERMISSAO_SISTEMA.UPLOAD, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.RELATORIOS]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.VISTORIA_VISUALIZAR]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
            [MODULOS_PERMISSAO_SISTEMA.VISTORIA_EDITAR]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.CADASTRAR, ACOES_PERMISSAO_SISTEMA.EDITAR, ACOES_PERMISSAO_SISTEMA.UPLOAD, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
        },
    },
    auditor: {
        modulos: {
            [MODULOS_PERMISSAO_SISTEMA.DASHBOARD_AUDITORIA]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.NOVA_AUDITORIA]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.CADASTRAR, ACOES_PERMISSAO_SISTEMA.UPLOAD, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.QR_CODE]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.RELATORIOS]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.VISTORIA_VISUALIZAR]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
        },
    },
    gestor: {
        modulos: {
            [MODULOS_PERMISSAO_SISTEMA.DASHBOARD_SST]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.DASHBOARD_AUDITORIA]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.EMPRESAS]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.COLABORADORES]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.TREINAMENTOS]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.QR_CODE]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
            [MODULOS_PERMISSAO_SISTEMA.RELATORIOS]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR, ACOES_PERMISSAO_SISTEMA.EXPORTAR],
            [MODULOS_PERMISSAO_SISTEMA.VISTORIA_VISUALIZAR]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
        },
    },
    consulta: {
        modulos: {
            [MODULOS_PERMISSAO_SISTEMA.DASHBOARD_SST]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
            [MODULOS_PERMISSAO_SISTEMA.EMPRESAS]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
            [MODULOS_PERMISSAO_SISTEMA.COLABORADORES]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
            [MODULOS_PERMISSAO_SISTEMA.TREINAMENTOS]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
            [MODULOS_PERMISSAO_SISTEMA.QR_CODE]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
            [MODULOS_PERMISSAO_SISTEMA.RELATORIOS]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
            [MODULOS_PERMISSAO_SISTEMA.VISTORIA_VISUALIZAR]: [ACOES_PERMISSAO_SISTEMA.VISUALIZAR],
        },
    },
    bloqueado: {
        modulos: {},
    },
});

const MODULOS_LEGADOS_EQUIVALENTES_PERMISSAO_SISTEMA = Object.freeze({
    [MODULOS_PERMISSAO_SISTEMA.VISTORIA_VISUALIZAR]: [
        MODULOS_PERMISSAO_SISTEMA.MAPA_OBRA_VISUALIZACAO,
    ],
    [MODULOS_PERMISSAO_SISTEMA.VISTORIA_EDITAR]: [
        MODULOS_PERMISSAO_SISTEMA.MAPA_OBRA_ADMINISTRACAO,
    ],
});

function usuarioTemPermissaoPadraoPorPerfil(permissao = null, modulo = "", acao = "") {
    const permissaoNormalizada = normalizarPermissaoSistema(permissao);
    const moduloTratado = normalizarTexto(modulo);
    const acaoTratada = normalizarTexto(acao);

    if (!permissaoNormalizada || !moduloTratado || !acaoTratada) return false;

    const perfil = normalizarPerfilSistema(permissaoNormalizada.perfil);
    const regraPerfil = PERMISSOES_PADRAO_OPERACIONAIS_POR_PERFIL[perfil];

    if (!regraPerfil) return false;
    if (regraPerfil.todos) return true;

    const acoesModulo = regraPerfil.modulos?.[moduloTratado];
    return Array.isArray(acoesModulo) && acoesModulo.includes(acaoTratada);
}

export function usuarioPodeExecutarAcaoSistema(permissao = null, modulo = "", acao = "") {
    const permissaoNormalizada = normalizarPermissaoSistema(permissao);
    const moduloTratado = normalizarTexto(modulo);
    const acaoTratada = normalizarTexto(acao);

    if (!permissaoNormalizada || !moduloTratado || !acaoTratada) return false;
    if (!permissaoSistemaEstaOperacional(permissaoNormalizada)) return false;
    if (permissaoSistemaTemAcessoGlobal(permissaoNormalizada)) return true;
    if (normalizarPerfilSistema(permissaoNormalizada.perfil) === "administrador") return true;

    const permissoes = obterPermissoesSistema(permissaoNormalizada);

    if (obterValorPermissaoJson(permissoes.acessoTotal)) return true;

    const permissoesModulo = permissoes.modulos?.[moduloTratado];

    if (permissoesModulo && typeof permissoesModulo === "object" && obterValorPermissaoJson(permissoesModulo[acaoTratada])) {
        return true;
    }

    const modulosLegadosEquivalentes =
        MODULOS_LEGADOS_EQUIVALENTES_PERMISSAO_SISTEMA[moduloTratado] || [];

    const possuiPermissaoLegada = modulosLegadosEquivalentes.some((moduloLegado) => {
        const permissaoLegada = permissoes.modulos?.[moduloLegado];

        return Boolean(
            permissaoLegada
            && typeof permissaoLegada === "object"
            && obterValorPermissaoJson(permissaoLegada[acaoTratada])
        );
    });

    if (possuiPermissaoLegada) {
        return true;
    }

    return usuarioTemPermissaoPadraoPorPerfil(permissaoNormalizada, moduloTratado, acaoTratada);
}

export function obterBloqueioVisualAcaoSistema(permissao = null, modulo = "", acao = "", mensagem = "") {
    const permitido = usuarioPodeExecutarAcaoSistema(permissao, modulo, acao);
    const acaoTratada = normalizarTexto(acao) || "ação";

    return {
        permitido,
        bloqueado: !permitido,
        disabled: !permitido,
        mensagem: permitido ? "Permissão liberada." : mensagem || `Sem permissão para ${acaoTratada.replace(/_/g, " ")} neste módulo.`,
    };
}

export function usuarioPodeExecutarAcaoCriticaSistema(permissao = null, acaoCritica = "") {
    const chaveAcaoCritica = normalizarTexto(acaoCritica);
    const metadados = METADADOS_ACOES_CRITICAS_PERMISSAO_SISTEMA[chaveAcaoCritica];

    if (!metadados) return false;
    if (!permissaoSistemaEstaOperacional(permissao)) return false;
    if (permissaoSistemaTemAcessoGlobal(permissao)) return true;
    if (usuarioTemAcaoCriticaNoJson(permissao, chaveAcaoCritica)) return true;

    return usuarioPodeExecutarAcaoSistema(permissao, metadados.moduloPadrao, metadados.acaoPadrao);
}

export function usuarioPodeExcluirSistema(permissao = null, modulo = MODULOS_PERMISSAO_SISTEMA.EMPRESAS) {
    return usuarioPodeExecutarAcaoCriticaSistema(permissao, ACOES_CRITICAS_PERMISSAO_SISTEMA.EXCLUIR)
        || usuarioPodeExecutarAcaoSistema(permissao, modulo, ACOES_PERMISSAO_SISTEMA.EXCLUIR);
}

export function usuarioPodeLimparArquivosSistema(permissao = null) {
    return usuarioPodeExecutarAcaoCriticaSistema(permissao, ACOES_CRITICAS_PERMISSAO_SISTEMA.LIMPAR_ARQUIVOS);
}

export function usuarioPodeGerenciarPermissoesSistema(permissao = null) {
    return usuarioPodeExecutarAcaoCriticaSistema(permissao, ACOES_CRITICAS_PERMISSAO_SISTEMA.GERENCIAR_PERMISSOES);
}

export function usuarioPodeAlterarConfiguracoesCriticasSistema(permissao = null) {
    return usuarioPodeExecutarAcaoCriticaSistema(permissao, ACOES_CRITICAS_PERMISSAO_SISTEMA.CONFIGURACOES_CRITICAS);
}

export function obterBloqueioVisualAcaoCriticaSistema(permissao = null, acaoCritica = "") {
    const chaveAcaoCritica = normalizarTexto(acaoCritica);
    const metadados = METADADOS_ACOES_CRITICAS_PERMISSAO_SISTEMA[chaveAcaoCritica] || {
        rotulo: "Ação crítica",
        mensagem: "Sem permissão para executar esta ação crítica.",
    };
    const permitido = usuarioPodeExecutarAcaoCriticaSistema(permissao, chaveAcaoCritica);

    return {
        permitido,
        bloqueado: !permitido,
        disabled: !permitido,
        rotulo: metadados.rotulo,
        mensagem: permitido ? "Permissão liberada." : metadados.mensagem,
    };
}

export function obterResumoAcoesCriticasSistema(permissao = null) {
    return {
        podeExcluir: usuarioPodeExcluirSistema(permissao),
        podeLimparArquivos: usuarioPodeLimparArquivosSistema(permissao),
        podeGerenciarPermissoes: usuarioPodeGerenciarPermissoesSistema(permissao),
        podeAlterarConfiguracoesCriticas: usuarioPodeAlterarConfiguracoesCriticasSistema(permissao),
    };
}

export const TELAS_MODULOS_PERMISSAO_SISTEMA = Object.freeze({
    dashboard: MODULOS_PERMISSAO_SISTEMA.DASHBOARD_SST,
    dashboardSst: MODULOS_PERMISSAO_SISTEMA.DASHBOARD_SST,
    plantasExtintores: MODULOS_PERMISSAO_SISTEMA.VISTORIA_EDITAR,
    vistoriaExtintores: MODULOS_PERMISSAO_SISTEMA.VISTORIA_EDITAR,
    extintores: MODULOS_PERMISSAO_SISTEMA.VISTORIA_EDITAR,
    mapaObra: MODULOS_PERMISSAO_SISTEMA.VISTORIA_EDITAR,
    mapaObraVisualizacao: MODULOS_PERMISSAO_SISTEMA.VISTORIA_VISUALIZAR,
    aniversariantes: MODULOS_PERMISSAO_SISTEMA.DASHBOARD_SST,
    empresas: MODULOS_PERMISSAO_SISTEMA.EMPRESAS,
    colaboradores: MODULOS_PERMISSAO_SISTEMA.COLABORADORES,
    treinamentos: MODULOS_PERMISSAO_SISTEMA.TREINAMENTOS,
    dds: MODULOS_PERMISSAO_SISTEMA.TREINAMENTOS,
    qr: MODULOS_PERMISSAO_SISTEMA.QR_CODE,
    consultaQr: MODULOS_PERMISSAO_SISTEMA.QR_CODE,
    auditoriaCampo: MODULOS_PERMISSAO_SISTEMA.DASHBOARD_AUDITORIA,
    dashboardAuditoria: MODULOS_PERMISSAO_SISTEMA.DASHBOARD_AUDITORIA,
    dashboardAuditoriaCampo: MODULOS_PERMISSAO_SISTEMA.DASHBOARD_AUDITORIA,
    novaAuditoriaCampo: MODULOS_PERMISSAO_SISTEMA.NOVA_AUDITORIA,
    novaAuditoria: MODULOS_PERMISSAO_SISTEMA.NOVA_AUDITORIA,
    auditoria: MODULOS_PERMISSAO_SISTEMA.AUDITORIA_SISTEMA,
    auditoriaSistema: MODULOS_PERMISSAO_SISTEMA.AUDITORIA_SISTEMA,
    acessosApp: MODULOS_PERMISSAO_SISTEMA.ACESSOS_APP,
    acessos: MODULOS_PERMISSAO_SISTEMA.ACESSOS_APP,
    usuariosApp: MODULOS_PERMISSAO_SISTEMA.ACESSOS_APP,
    configuracoes: MODULOS_PERMISSAO_SISTEMA.CONFIGURACOES,
    configurações: MODULOS_PERMISSAO_SISTEMA.CONFIGURACOES,
    roteiro: MODULOS_PERMISSAO_SISTEMA.CONFIGURACOES,
    requisitos: MODULOS_PERMISSAO_SISTEMA.CONFIGURACOES,
});

export function obterModuloPermissaoSistemaPorTela(tela = "") {
    const telaTratada = normalizarTexto(tela);
    return TELAS_MODULOS_PERMISSAO_SISTEMA[telaTratada] || "";
}

export function usuarioPodeAcessarTelaSistema(permissao = null, tela = "") {
    const modulo = obterModuloPermissaoSistemaPorTela(tela);

    if (!modulo) return true;

    return usuarioPodeExecutarAcaoSistema(permissao, modulo, ACOES_PERMISSAO_SISTEMA.VISUALIZAR);
}

export function obterBloqueioVisualTelaSistema(permissao = null, tela = "") {
    const modulo = obterModuloPermissaoSistemaPorTela(tela);
    const permitido = !modulo || usuarioPodeAcessarTelaSistema(permissao, tela);

    return {
        permitido,
        bloqueado: !permitido,
        disabled: !permitido,
        modulo,
        mensagem: permitido
            ? "Permissão liberada para acessar este módulo."
            : "Sem permissão para acessar esta área do sistema.",
    };
}


const STATUS_SOLICITACAO_ACESSO_SISTEMA_VALIDOS = new Set([
    "pendente",
    "aprovada",
    "recusada",
    "cancelada",
    "concluida",
]);

function normalizarStatusSolicitacaoAcessoSistema(valor) {
    const status = normalizarTexto(valor || "pendente").toLowerCase();
    return STATUS_SOLICITACAO_ACESSO_SISTEMA_VALIDOS.has(status) ? status : "pendente";
}

export function normalizarSolicitacaoAcessoSistema(solicitacao = null) {
    if (!solicitacao) return null;

    return {
        id: solicitacao.id || null,
        user_id: solicitacao.user_id || null,
        nome: solicitacao.nome || "",
        email: normalizarEmail(solicitacao.email),
        area_solicitada: solicitacao.area_solicitada || "",
        tela: solicitacao.tela || "",
        perfil_atual: solicitacao.perfil_atual || "",
        status: normalizarStatusSolicitacaoAcessoSistema(solicitacao.status),
        observacao: solicitacao.observacao || "",
        resposta_admin: solicitacao.resposta_admin || "",
        aprovado_por_user_id: solicitacao.aprovado_por_user_id || null,
        aprovado_por_email: normalizarEmail(solicitacao.aprovado_por_email),
        aprovado_por_nome: solicitacao.aprovado_por_nome || "",
        aprovado_em: solicitacao.aprovado_em || null,
        recusado_por_user_id: solicitacao.recusado_por_user_id || null,
        recusado_por_email: normalizarEmail(solicitacao.recusado_por_email),
        recusado_por_nome: solicitacao.recusado_por_nome || "",
        recusado_em: solicitacao.recusado_em || null,
        concluido_por_user_id: solicitacao.concluido_por_user_id || null,
        concluido_por_email: normalizarEmail(solicitacao.concluido_por_email),
        concluido_por_nome: solicitacao.concluido_por_nome || "",
        concluido_em: solicitacao.concluido_em || null,
        criado_em: solicitacao.criado_em || null,
        atualizado_em: solicitacao.atualizado_em || null,
    };
}

export async function registrarSolicitacaoAcessoSistemaService({ supabase, solicitacao }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para registrar solicitação de acesso.");
    }

    const dados = {
        nome: normalizarTexto(solicitacao?.nome),
        email: normalizarEmail(solicitacao?.email),
        areaSolicitada: normalizarTexto(solicitacao?.areaSolicitada || solicitacao?.area_solicitada),
        tela: normalizarTexto(solicitacao?.tela),
        perfilAtual: normalizarTexto(solicitacao?.perfilAtual || solicitacao?.perfil_atual),
        observacao: normalizarTexto(solicitacao?.observacao),
    };

    if (!dados.areaSolicitada) {
        throw new Error("Área solicitada não informada para registrar a solicitação de acesso.");
    }

    const { data, error } = await supabase.rpc("registrar_solicitacao_acesso_sistema", {
        p_nome: dados.nome,
        p_email: dados.email,
        p_area_solicitada: dados.areaSolicitada,
        p_tela: dados.tela,
        p_perfil_atual: dados.perfilAtual,
        p_observacao: dados.observacao,
    });

    if (error) {
        throw new Error(error.message || "Erro ao registrar solicitação de acesso no sistema.");
    }

    const solicitacaoSalva = Array.isArray(data) ? data[0] : data;

    return normalizarSolicitacaoAcessoSistema(solicitacaoSalva || null);
}

export async function listarSolicitacoesAcessoSistemaService({ supabase }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para listar solicitações de acesso.");
    }

    const { data, error } = await supabase.rpc("admin_listar_solicitacoes_acesso_sistema");

    if (error) {
        throw new Error(error.message || "Erro ao listar solicitações de acesso do sistema.");
    }

    const solicitacoes = Array.isArray(data) ? data : [];

    return solicitacoes.map((solicitacao) => normalizarSolicitacaoAcessoSistema(solicitacao)).filter(Boolean);
}

export async function responderSolicitacaoAcessoSistemaService({ supabase, solicitacaoId, status, respostaAdmin = "" }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para responder solicitação de acesso.");
    }

    const id = normalizarTexto(solicitacaoId);
    const statusTratado = normalizarStatusSolicitacaoAcessoSistema(status);
    const resposta = normalizarTexto(respostaAdmin);

    if (!id) {
        throw new Error("Solicitação não informada para aprovação ou recusa.");
    }

    if (!["aprovada", "recusada", "concluida"].includes(statusTratado)) {
        throw new Error("Status inválido. Use aprovada, recusada ou concluida.");
    }

    const { data, error } = await supabase.rpc("admin_responder_solicitacao_acesso_sistema", {
        p_solicitacao_id: id,
        p_status: statusTratado,
        p_resposta_admin: resposta,
    });

    if (error) {
        throw new Error(error.message || "Erro ao responder solicitação de acesso do sistema.");
    }

    const solicitacaoAtualizada = Array.isArray(data) ? data[0] : data;

    return normalizarSolicitacaoAcessoSistema(solicitacaoAtualizada || null);
}


export async function concluirSolicitacaoAcessoSistemaService({ supabase, solicitacaoId, respostaAdmin = "" }) {
    return responderSolicitacaoAcessoSistemaService({
        supabase,
        solicitacaoId,
        status: "concluida",
        respostaAdmin,
    });
}

export function obterResumoPermissaoSistema(permissao = null) {
    const permissaoNormalizada = normalizarPermissaoSistema(permissao);

    if (!permissaoNormalizada) {
        return {
            perfil: "Sem permissão cadastrada",
            status: "Não carregado",
            acessoGlobal: false,
            bloqueado: true,
            ativo: false,
        };
    }

    return {
        perfil: permissaoNormalizada.perfil,
        status: permissaoNormalizada.bloqueado
            ? "Bloqueado"
            : permissaoNormalizada.ativo
              ? "Ativo"
              : "Inativo",
        acessoGlobal: permissaoNormalizada.acesso_global,
        bloqueado: permissaoNormalizada.bloqueado,
        ativo: permissaoNormalizada.ativo,
    };
}
