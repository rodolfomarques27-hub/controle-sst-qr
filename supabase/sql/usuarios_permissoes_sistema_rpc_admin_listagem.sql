-- Roteiro 11 — Etapa 2.10A
-- RPC administrativa para listar usuários e permissões gerais do sistema.
--
-- Importante:
-- 1. Esta RPC lista usuários cadastrados na tabela usuarios_permissoes_sistema.
-- 2. Uso previsto no painel Configurações > Usuários e Permissões.
-- 3. Ainda não aplica bloqueio real no front-end.
-- 4. A tabela auditoria_usuarios_autorizados continua separada para Auditoria do Sistema.

create or replace function public.admin_listar_usuarios_permissoes_sistema()
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
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    usuario_admin record;
begin
    select
        ups.id,
        ups.email,
        ups.perfil,
        ups.ativo,
        ups.bloqueado,
        ups.acesso_global
    into usuario_admin
    from public.usuarios_permissoes_sistema ups
    where ups.ativo = true
      and ups.bloqueado = false
      and (
          ups.user_id = auth.uid()
          or lower(ups.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    limit 1;

    if current_user = 'postgres' then
        return query
        select
            ups.id,
            ups.user_id,
            ups.email,
            ups.nome,
            ups.funcao,
            ups.perfil,
            ups.ativo,
            ups.bloqueado,
            ups.acesso_global,
            ups.created_at,
            ups.updated_at
        from public.usuarios_permissoes_sistema ups
        order by ups.created_at desc;
        return;
    end if;

    if usuario_admin.id is null then
        raise exception 'Acesso negado. Usuário sem permissão administrativa.';
    end if;

    if usuario_admin.acesso_global is not true and usuario_admin.perfil <> 'administrador' then
        raise exception 'Acesso negado. Somente administrador pode listar permissões.';
    end if;

    return query
    select
        ups.id,
        ups.user_id,
        ups.email,
        ups.nome,
        ups.funcao,
        ups.perfil,
        ups.ativo,
        ups.bloqueado,
        ups.acesso_global,
        ups.created_at,
        ups.updated_at
    from public.usuarios_permissoes_sistema ups
    order by ups.created_at desc;
end;
$$;

grant execute on function public.admin_listar_usuarios_permissoes_sistema() to authenticated;

comment on function public.admin_listar_usuarios_permissoes_sistema() is
'Lista administrativa de usuários e permissões gerais do sistema. Uso futuro no painel de Configurações.';
