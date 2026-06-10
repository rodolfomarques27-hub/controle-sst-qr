-- Roteiro 11 — Etapa 2.10C
-- Correção de segurança da RPC administrativa de listagem de usuários/permissões.
--
-- Motivo:
-- A RPC administrativa não deve liberar listagem por current_user = 'postgres',
-- porque funções SECURITY DEFINER podem executar com o usuário dono da função.
-- A validação deve considerar somente o usuário autenticado via auth.uid()/auth.jwt().
--
-- Esta etapa NÃO altera React, NÃO aplica bloqueio real e NÃO altera login.

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
'Lista administrativa segura de usuários e permissões gerais do sistema. Exige usuário autenticado com perfil administrador ou acesso_global.';
