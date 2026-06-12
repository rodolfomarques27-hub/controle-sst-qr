-- Roteiro 14 - Pacote 9AB
-- Corrige persistência da foto do acesso após atualizar a página.
-- Causa: a foto estava no Storage, mas as RPCs de leitura/listagem não retornavam foto_url.

alter table public.usuarios_permissoes_sistema
add column if not exists foto_url text;

-- Remove versões antigas da RPC de listagem para permitir recriar o retorno com foto_url.
do $$
declare
    f record;
begin
    for f in
        select p.oid::regprocedure as assinatura
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'admin_listar_usuarios_permissoes_sistema'
    loop
        execute 'drop function if exists ' || f.assinatura || ' cascade';
    end loop;
end $$;

-- Remove versões antigas da RPC do usuário atual para permitir recriar o retorno com foto_url.
do $$
declare
    f record;
begin
    for f in
        select p.oid::regprocedure as assinatura
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'usuario_permissao_sistema_atual'
    loop
        execute 'drop function if exists ' || f.assinatura || ' cascade';
    end loop;
end $$;

create or replace function public.usuario_permissao_sistema_atual()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa text,
    foto_url text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    precisa_trocar_senha boolean,
    ultimo_login_em timestamptz,
    login_criado_em timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_uid uuid := auth.uid();
    v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
    if v_uid is null and v_email = '' then
        return;
    end if;

    return query
    select
        u.id,
        u.user_id,
        u.email,
        u.nome,
        u.funcao,
        u.empresa,
        u.foto_url,
        u.perfil,
        coalesce(u.ativo, false) as ativo,
        coalesce(u.bloqueado, true) as bloqueado,
        coalesce(u.acesso_global, false) as acesso_global,
        coalesce(u.permissoes, '{}'::jsonb) as permissoes,
        u.observacao,
        coalesce(u.precisa_trocar_senha, false) as precisa_trocar_senha,
        u.ultimo_login_em,
        u.login_criado_em,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    where
        (v_uid is not null and u.user_id = v_uid)
        or
        (v_email <> '' and lower(coalesce(u.email, '')) = v_email)
    order by
        case when v_uid is not null and u.user_id = v_uid then 0 else 1 end,
        u.updated_at desc nulls last,
        u.created_at desc nulls last
    limit 1;
end;
$$;

grant execute on function public.usuario_permissao_sistema_atual() to authenticated, service_role;

create or replace function public.admin_listar_usuarios_permissoes_sistema()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa text,
    foto_url text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    precisa_trocar_senha boolean,
    ultimo_login_em timestamptz,
    login_criado_em timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_atual record;
    v_pode_gerenciar boolean := false;
begin
    select * into v_atual
    from public.usuario_permissao_sistema_atual()
    limit 1;

    v_pode_gerenciar :=
        coalesce(v_atual.ativo, false)
        and not coalesce(v_atual.bloqueado, true)
        and (
            coalesce(v_atual.acesso_global, false)
            or lower(coalesce(v_atual.perfil, '')) = 'administrador'
            or lower(coalesce(v_atual.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes', 'false')) = 'true'
            or lower(coalesce(v_atual.permissoes -> 'modulos' -> 'acessos_app' ->> 'gerenciar_permissoes', 'false')) = 'true'
            or lower(coalesce(v_atual.permissoes -> 'modulos' -> 'configuracoes' ->> 'gerenciar_permissoes', 'false')) = 'true'
        );

    if not v_pode_gerenciar then
        raise exception 'Sem permissão para listar usuários e permissões do app.';
    end if;

    return query
    select
        u.id,
        u.user_id,
        u.email,
        u.nome,
        u.funcao,
        u.empresa,
        u.foto_url,
        u.perfil,
        coalesce(u.ativo, false) as ativo,
        coalesce(u.bloqueado, true) as bloqueado,
        coalesce(u.acesso_global, false) as acesso_global,
        coalesce(u.permissoes, '{}'::jsonb) as permissoes,
        u.observacao,
        coalesce(u.precisa_trocar_senha, false) as precisa_trocar_senha,
        u.ultimo_login_em,
        u.login_criado_em,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    where coalesce(u.excluido, false) is false
    order by
        case when lower(coalesce(u.perfil, '')) = 'administrador' then 0 else 1 end,
        coalesce(u.ativo, false) desc,
        coalesce(u.bloqueado, false) asc,
        u.nome nulls last,
        u.email nulls last;
end;
$$;

grant execute on function public.admin_listar_usuarios_permissoes_sistema() to authenticated, service_role;

notify pgrst, 'reload schema';
