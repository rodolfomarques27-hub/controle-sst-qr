const PERMISSAO_SISTEMA_PADRAO_SEGURA = {
    id: null,
    user_id: null,
    email: "",
    nome: "",
    funcao: "",
    perfil: "consulta",
    ativo: false,
    bloqueado: true,
    acesso_global: false,
    permissoes: {},
    observacao: "",
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
        perfil: permissao.perfil || "consulta",
        ativo: normalizarBooleano(permissao.ativo),
        bloqueado: normalizarBooleano(permissao.bloqueado),
        acesso_global: normalizarBooleano(permissao.acesso_global),
        permissoes: permissao.permissoes && typeof permissao.permissoes === "object" ? permissao.permissoes : {},
        observacao: permissao.observacao || "",
    };
}

function validarDadosUsuarioPermissaoSistema(usuario = {}) {
    const email = normalizarEmail(usuario.email);
    const nome = normalizarTexto(usuario.nome);
    const funcao = normalizarTexto(usuario.funcao);
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
        perfil,
        ativo,
        bloqueado,
        acessoGlobal,
        observacao,
    };
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

    return normalizarPermissaoSistema(permissao || null);
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

export async function salvarUsuarioPermissaoSistemaService({ supabase, usuario }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para salvar usuário e permissão do sistema.");
    }

    const dados = validarDadosUsuarioPermissaoSistema(usuario);

    const { data, error } = await supabase.rpc("admin_salvar_usuario_permissao_sistema", {
        p_email: dados.email,
        p_nome: dados.nome,
        p_funcao: dados.funcao,
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
