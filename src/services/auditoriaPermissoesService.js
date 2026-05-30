export async function carregarUsuariosAutorizadosAuditoriaService({ supabase }) {
    const { data, error } = await supabase
        .from("auditoria_usuarios_autorizados")
        .select("id, created_at, email, nome, funcao, ativo, observacao, user_id, empresa_id, perfil, acesso_global, pode_acessar_auditoria")
        .order("email", { ascending: true });

    if (error) {
        throw new Error(error.message || "Erro ao carregar usuários autorizados.");
    }

    return data || [];
}

export async function salvarUsuarioAutorizadoAuditoriaService({ supabase, usuarioAutorizado }) {
    const emailTratado = String(usuarioAutorizado?.email || "").trim().toLowerCase();

    if (!emailTratado) {
        throw new Error("Informe o e-mail do usuário autorizado.");
    }

    const { error } = await supabase
        .from("auditoria_usuarios_autorizados")
        .upsert(
            {
                email: emailTratado,
                nome: usuarioAutorizado.nome || null,
                funcao: usuarioAutorizado.funcao || null,
                ativo: true,
                perfil: usuarioAutorizado.perfil || "usuario",
                pode_acessar_auditoria: true,
            },
            { onConflict: "email" }
        );

    if (error) {
        throw new Error(error.message || "Erro ao autorizar usuário.");
    }

    return true;
}

export async function alternarUsuarioAutorizadoAuditoriaService({ supabase, usuarioAutorizado, usuario }) {
    if (!usuarioAutorizado?.id) {
        throw new Error("Usuário autorizado inválido para atualização.");
    }

    const acessoAtual = Boolean(usuarioAutorizado.pode_acessar_auditoria);
    const novoAcessoAuditoria = !acessoAtual;

    if (
        acessoAtual &&
        usuario?.email &&
        usuarioAutorizado.email?.toLowerCase() === usuario.email.toLowerCase()
    ) {
        throw new Error("Você não pode bloquear o próprio acesso à Auditoria de sistema pelo sistema.");
    }

    if (acessoAtual && usuarioAutorizado.acesso_global) {
        throw new Error("Este usuário é administrador global. Remova o acesso global no Supabase antes de bloquear a Auditoria de sistema.");
    }

    const payloadAtualizacao = novoAcessoAuditoria
        ? { pode_acessar_auditoria: true, ativo: true }
        : { pode_acessar_auditoria: false };

    const { error } = await supabase
        .from("auditoria_usuarios_autorizados")
        .update(payloadAtualizacao)
        .eq("id", usuarioAutorizado.id);

    if (error) {
        throw new Error(error.message || "Erro ao atualizar permissão da Auditoria.");
    }

    return {
        ok: true,
        novoAcessoAuditoria,
        payloadAtualizacao,
    };
}

export async function verificarAcessoAuditoriaService({ supabase, usuario }) {
    if (!usuario?.email) return false;

    const { data, error } = await supabase.rpc("usuario_pode_acessar_auditoria");

    if (error) {
        throw new Error(error.message || "Erro ao verificar permissão da Auditoria de sistema.");
    }

    return Boolean(data);
}
