-- Roteiro 14 - Acessos do App: exclusao definitiva do acesso
-- Objetivo: o botao "Excluir acesso" remove o registro da tabela de permissoes,
-- em vez de apenas ocultar/marcar como excluido.

begin;

create or replace function public.admin_excluir_usuario_permissao_sistema(
    p_email text default null,
    p_id uuid default null,
    p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_admin public.usuarios_permissoes_sistema;
    v_alvo public.usuarios_permissoes_sistema;
    v_email text := lower(trim(coalesce(p_email, '')));
    v_admin_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
    v_pode_gerenciar boolean := false;
begin
    if auth.uid() is null then
        raise exception 'Usuário autenticado não identificado.';
    end if;

    select * into v_admin
    from public.usuarios_permissoes_sistema u
    where u.user_id = auth.uid()
       or lower(coalesce(u.email, '')) = v_admin_email
    order by
        case when u.user_id = auth.uid() then 0 else 1 end,
        u.updated_at desc nulls last,
        u.created_at desc nulls last
    limit 1;

    if v_admin.id is null then
        raise exception 'Usuário atual não possui permissão administrativa cadastrada.';
    end if;

    v_pode_gerenciar :=
        coalesce(v_admin.ativo, false)
        and not coalesce(v_admin.bloqueado, true)
        and not coalesce(v_admin.excluido, false)
        and (
            lower(coalesce(v_admin.perfil, '')) = 'administrador'
            or coalesce(v_admin.acesso_global, false)
            or coalesce(v_admin.pode_gerenciar_permissoes, false)
            or lower(coalesce(v_admin.permissoes ->> 'acessoTotal', 'false')) = 'true'
            or lower(coalesce(v_admin.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes', 'false')) = 'true'
            or lower(coalesce(v_admin.permissoes -> 'modulos' -> 'acessos_app' ->> 'gerenciar_permissoes', 'false')) = 'true'
        );

    if not v_pode_gerenciar then
        raise exception 'Sem permissão para excluir acessos do app.';
    end if;

    select * into v_alvo
    from public.usuarios_permissoes_sistema u
    where (p_id is not null and u.id = p_id)
       or (v_email <> '' and lower(coalesce(u.email, '')) = v_email)
    order by
        case when p_id is not null and u.id = p_id then 0 else 1 end,
        u.updated_at desc nulls last,
        u.created_at desc nulls last
    limit 1;

    if v_alvo.id is null then
        raise exception 'Acesso do usuário não encontrado para exclusão.';
    end if;

    if v_alvo.user_id = auth.uid()
       or lower(coalesce(v_alvo.email, '')) = v_admin_email then
        raise exception 'Você não pode excluir o próprio acesso ao app.';
    end if;

    delete from public.usuarios_permissoes_sistema
    where id = v_alvo.id;

    return jsonb_build_object(
        'ok', true,
        'id', v_alvo.id,
        'email', v_alvo.email,
        'mensagem', 'Acesso excluído definitivamente da lista do app. Colaboradores, empresas, documentos e Auth não foram apagados.'
    );
end;
$$;

grant execute on function public.admin_excluir_usuario_permissao_sistema(text, uuid, text) to authenticated, service_role;

-- Remove registros que haviam sido marcados como excluidos na etapa anterior.
do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'usuarios_permissoes_sistema'
          and column_name = 'excluido'
    ) then
        delete from public.usuarios_permissoes_sistema
        where coalesce(excluido, false) is true;
    end if;
end $$;

notify pgrst, 'reload schema';

commit;
