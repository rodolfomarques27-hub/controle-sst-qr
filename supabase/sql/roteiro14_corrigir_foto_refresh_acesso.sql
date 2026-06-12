-- Roteiro 14 - Pacote 9AA
-- Corrige foto do acesso que some após atualizar a página.
-- Causa: a foto era salva por admin_salvar_usuario_permissao_sistema,
-- mas a listagem/administração não retornava foto_url no reload.

begin;

alter table public.usuarios_permissoes_sistema
    add column if not exists empresa text;

alter table public.usuarios_permissoes_sistema
    add column if not exists foto_url text;

alter table public.usuarios_permissoes_sistema
    add column if not exists excluido boolean not null default false;

alter table public.usuarios_permissoes_sistema
    add column if not exists excluido_em timestamptz;

alter table public.usuarios_permissoes_sistema
    add column if not exists excluido_por uuid;

alter table public.usuarios_permissoes_sistema
    add column if not exists criado_por uuid;

alter table public.usuarios_permissoes_sistema
    add column if not exists atualizado_por uuid;

-- A função de usuário atual também precisa devolver foto_url,
-- pois o cabeçalho/resumo pode ser reconstruído após refresh.
drop function if exists public.usuario_permissao_sistema_atual();

create function public.usuario_permissao_sistema_atual()
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
    criado_por uuid,
    atualizado_por uuid,
    excluido boolean,
    excluido_em timestamptz,
    excluido_por uuid,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
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
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.criado_por,
        u.atualizado_por,
        coalesce(u.excluido, false),
        u.excluido_em,
        u.excluido_por,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    where (
        (auth.uid() is not null and u.user_id = auth.uid())
        or (v_email <> '' and lower(coalesce(u.email, '')) = v_email)
    )
      and coalesce(u.excluido, false) is not true
    order by
        case when auth.uid() is not null and u.user_id = auth.uid() then 0 else 1 end,
        coalesce(u.updated_at, u.created_at) desc nulls last
    limit 1;
end;
$$;

grant execute on function public.usuario_permissao_sistema_atual() to authenticated, service_role;

-- A listagem administrativa precisa retornar foto_url para a foto permanecer após atualizar a página.
drop function if exists public.admin_listar_usuarios_permissoes_sistema();

create function public.admin_listar_usuarios_permissoes_sistema()
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
    criado_por uuid,
    atualizado_por uuid,
    excluido boolean,
    excluido_em timestamptz,
    excluido_por uuid,
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
        and coalesce(v_admin.excluido, false) is not true
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
        u.empresa,
        u.foto_url,
        u.perfil,
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.criado_por,
        u.atualizado_por,
        coalesce(u.excluido, false),
        u.excluido_em,
        u.excluido_por,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    where coalesce(u.excluido, false) is not true
    order by
        coalesce(u.ativo, false) desc,
        coalesce(u.bloqueado, false) asc,
        lower(coalesce(u.empresa, '')) asc,
        lower(coalesce(u.nome, u.email, '')) asc;
end;
$$;

grant execute on function public.admin_listar_usuarios_permissoes_sistema() to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
