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

function normalizarBooleano(valor) {
    return valor === true || valor === "true";
}

export function normalizarPermissaoSistema(permissao = null) {
    if (!permissao) return null;

    return {
        ...PERMISSAO_SISTEMA_PADRAO_SEGURA,
        ...permissao,
        email: String(permissao.email || "").trim().toLowerCase(),
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

export async function usuarioTemPermissaoSistemaService({ supabase, modulo, acao }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para validar permissão do sistema.");
    }

    const moduloTratado = String(modulo || "").trim();
    const acaoTratada = String(acao || "").trim();

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
