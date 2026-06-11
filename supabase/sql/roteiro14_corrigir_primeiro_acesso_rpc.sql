-- Roteiro 14 - Correcao emergencial do primeiro acesso
-- Execute no SQL Editor do Supabase.
-- Objetivo: garantir colunas e RPCs usadas pelo login com senha temporaria.

begin;

-- 1) Garantir tabela base.
do $$
begin
    if to_regclass('public.usuarios_permissoes_sistema') is null then
        raise exception 'Tabela public.usuarios_permissoes_sistema não encontrada.';
    end if;
end $$;

-- 2) Garantir colunas obrigatorias para primeiro acesso.
alter table public.usuarios_permissoes_sistema
    add column if not exists precisa_trocar_senha boolean not null default false;

alter table public.usuarios_permissoes_sistema
    add column if not exists ultimo_login_em timestamptz;

alter table public.usuarios_permissoes_sistema
    add column if not exists login_criado_em timestamptz;

alter table public.usuarios_permissoes_sistema
    add column if not exists criado_por uuid;

alter table public.usuarios_permissoes_sistema
    add column if not exists atualizado_por uuid;

create index if not exists idx_usuarios_permissoes_sistema_email_lower
    on public.usuarios_permissoes_sistema (lower(email));

create index if not exists idx_usuarios_permissoes_sistema_user_id
    on public.usuarios_permissoes_sistema (user_id);

create index if not exists idx_usuarios_permissoes_sistema_primeiro_acesso
    on public.usuarios_permissoes_sistema (precisa_trocar_senha)
    where precisa_trocar_senha = true;

-- 3) Derrubar RPCs que dependem do retorno antigo, na ordem segura.
drop function if exists public.admin_marcar_login_app_criado_sistema(text, uuid, boolean);
drop function if exists public.registrar_login_usuario_sistema();
drop function if exists public.finalizar_troca_senha_temporaria_sistema();
drop function if exists public.admin_listar_usuarios_permissoes_sistema();
drop function if exists public.usuario_permissao_sistema_atual();

-- 4) Permissao do usuario autenticado.
create function public.usuario_permissao_sistema_atual()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
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
    if v_uid is null and coalesce(v_email, '') = '' then
        return;
    end if;

    return query
    select
        u.id,
        u.user_id,
        u.email,
        u.nome,
        u.funcao,
        u.perfil,
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    where
        (v_uid is not null and u.user_id = v_uid)
        or (
            coalesce(v_email, '') <> ''
            and lower(coalesce(u.email, '')) = v_email
        )
    order by
        case when v_uid is not null and u.user_id = v_uid then 0 else 1 end,
        u.updated_at desc nulls last,
        u.created_at desc nulls last
    limit 1;
end;
$$;

grant execute on function public.usuario_permissao_sistema_atual() to authenticated;

-- 5) Listagem administrativa.
create function public.admin_listar_usuarios_permissoes_sistema()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
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
    v_admin record;
    v_pode_gerenciar boolean := false;
begin
    select * into v_admin
    from public.usuario_permissao_sistema_atual()
    limit 1;

    v_pode_gerenciar :=
        coalesce(v_admin.ativo, false)
        and not coalesce(v_admin.bloqueado, true)
        and (
            coalesce(v_admin.acesso_global, false)
            or v_admin.perfil = 'administrador'
            or lower(coalesce(v_admin.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes', 'false')) = 'true'
            or lower(coalesce(v_admin.permissoes -> 'modulos' -> 'acessos_app' ->> 'gerenciar_permissoes', 'false')) = 'true'
            or lower(coalesce(v_admin.permissoes -> 'modulos' -> 'configuracoes' ->> 'gerenciar_permissoes', 'false')) = 'true'
        );

    if not v_pode_gerenciar then
        raise exception 'Sem permissão para listar usuários e permissões do sistema.';
    end if;

    return query
    select
        u.id,
        u.user_id,
        u.email,
        u.nome,
        u.funcao,
        u.perfil,
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    order by
        coalesce(u.ativo, false) desc,
        coalesce(u.bloqueado, false) asc,
        lower(coalesce(u.nome, u.email, '')) asc;
end;
$$;

grant execute on function public.admin_listar_usuarios_permissoes_sistema() to authenticated;

-- 6) Marcar login criado/redefinido pela Edge Function.
create function public.admin_marcar_login_app_criado_sistema(
    p_email text,
    p_user_id uuid default null,
    p_precisa_trocar_senha boolean default true
)
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
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
    v_email text := lower(trim(coalesce(p_email, '')));
begin
    if v_email = '' or position('@' in v_email) = 0 then
        raise exception 'E-mail inválido para vincular login do app.';
    end if;

    update public.usuarios_permissoes_sistema u
    set
        user_id = coalesce(p_user_id, u.user_id),
        precisa_trocar_senha = coalesce(p_precisa_trocar_senha, true),
        login_criado_em = coalesce(u.login_criado_em, now()),
        atualizado_por = auth.uid(),
        updated_at = now()
    where lower(coalesce(u.email, '')) = v_email;

    if not found then
        raise exception 'Permissão não encontrada para o e-mail %. Salve a permissão antes de vincular o login.', v_email;
    end if;

    return query
    select * from public.usuario_permissao_sistema_atual()
    union all
    select
        u.id,
        u.user_id,
        u.email,
        u.nome,
        u.funcao,
        u.perfil,
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    where lower(coalesce(u.email, '')) = v_email
    limit 1;
end;
$$;

grant execute on function public.admin_marcar_login_app_criado_sistema(text, uuid, boolean) to authenticated;

-- 7) Registrar login e atualizar ultimo_login_em.
create function public.registrar_login_usuario_sistema()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
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
    if v_uid is null and coalesce(v_email, '') = '' then
        raise exception 'Usuário não autenticado.';
    end if;

    update public.usuarios_permissoes_sistema u
    set
        user_id = coalesce(u.user_id, v_uid),
        ultimo_login_em = now(),
        updated_at = now()
    where
        (v_uid is not null and u.user_id = v_uid)
        or (coalesce(v_email, '') <> '' and lower(coalesce(u.email, '')) = v_email);

    return query
    select * from public.usuario_permissao_sistema_atual();
end;
$$;

grant execute on function public.registrar_login_usuario_sistema() to authenticated;

-- 8) Finalizar troca de senha temporaria.
create function public.finalizar_troca_senha_temporaria_sistema()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
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
    if v_uid is null and coalesce(v_email, '') = '' then
        raise exception 'Usuário não autenticado.';
    end if;

    update public.usuarios_permissoes_sistema u
    set
        user_id = coalesce(u.user_id, v_uid),
        precisa_trocar_senha = false,
        ultimo_login_em = now(),
        atualizado_por = v_uid,
        updated_at = now()
    where
        (v_uid is not null and u.user_id = v_uid)
        or (coalesce(v_email, '') <> '' and lower(coalesce(u.email, '')) = v_email);

    return query
    select * from public.usuario_permissao_sistema_atual();
end;
$$;

grant execute on function public.finalizar_troca_senha_temporaria_sistema() to authenticated;

commit;
