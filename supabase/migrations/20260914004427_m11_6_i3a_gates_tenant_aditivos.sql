-- SafeScan Brasil
-- M11.6-I3A
-- Gates centrais tenant-aware aditivos.
--
-- Escopo:
--   1. evoluir public.usuario_ativo_sistema();
--   2. evoluir public.usuario_tem_acesso_empresa(uuid);
--   3. preservar integralmente os caminhos legados;
--   4. adicionar memberships/tenant como novo caminho de acesso;
--   5. nao alterar policies, Storage, dados de negocio ou status de tenant.
--
-- Premissa de seguranca desta migration:
--   no momento da aplicacao deve existir zero tenant ativo.
--   Isso garante que o novo ramo tenant-aware permaneça inerte
--   ate ativacao posterior e explicitamente controlada.

begin;

do $preflight$
declare
    v_tenants_ativos bigint;
    v_empresas_sem_tenant bigint;
begin
    if to_regprocedure(
        'public.usuario_ativo_sistema()'
    ) is null then
        raise exception
            'M11.6-I3A: public.usuario_ativo_sistema() ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_empresa(uuid)'
    ) is null then
        raise exception
            'M11.6-I3A: public.usuario_tem_acesso_empresa(uuid) ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_tenant(uuid)'
    ) is null then
        raise exception
            'M11.6-I3A: public.usuario_tem_acesso_tenant(uuid) ausente.';
    end if;

    if to_regclass(
        'public.tenant_memberships'
    ) is null then
        raise exception
            'M11.6-I3A: public.tenant_memberships ausente.';
    end if;

    if to_regclass(
        'public.tenants'
    ) is null then
        raise exception
            'M11.6-I3A: public.tenants ausente.';
    end if;

    if to_regclass(
        'public.empresas'
    ) is null then
        raise exception
            'M11.6-I3A: public.empresas ausente.';
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'empresas'
          and column_name = 'tenant_id'
          and data_type = 'uuid'
    ) then
        raise exception
            'M11.6-I3A: public.empresas.tenant_id uuid ausente.';
    end if;

    select count(*)
    into v_tenants_ativos
    from public.tenants
    where status = 'ativo';

    if v_tenants_ativos <> 0 then
        raise exception
            'M11.6-I3A: esperado 0 tenant ativo antes da aplicacao; encontrados %.',
            v_tenants_ativos;
    end if;

    select count(*)
    into v_empresas_sem_tenant
    from public.empresas
    where tenant_id is null;

    if v_empresas_sem_tenant <> 0 then
        raise exception
            'M11.6-I3A: existem % empresas sem tenant_id.',
            v_empresas_sem_tenant;
    end if;
end;
$preflight$;

-- =============================================================
-- GATE 1
-- usuario_ativo_sistema()
--
-- Compatibilidade:
--   - preserva integralmente usuarios_permissoes_sistema;
--   - adiciona membership ativa em tenant ativo.
--
-- Como nenhum tenant esta ativo no preflight, o novo ramo
-- nao altera o resultado efetivo da producao no momento
-- da aplicacao.
-- =============================================================

create or replace function public.usuario_ativo_sistema()
returns boolean
language sql
security definer
set search_path = pg_catalog, public
as $function$
    select
        exists (
            select 1
            from public.usuarios_permissoes_sistema u
            where coalesce(u.ativo, false) = true
              and coalesce(u.bloqueado, false) = false
              and (
                  (
                      auth.uid() is not null
                      and u.user_id = auth.uid()
                  )
                  or (
                      nullif(
                          trim(
                              coalesce(
                                  auth.jwt() ->> 'email',
                                  ''
                              )
                          ),
                          ''
                      ) is not null
                      and lower(
                          coalesce(
                              u.email,
                              ''
                          )
                      ) = lower(
                          trim(
                              auth.jwt() ->> 'email'
                          )
                      )
                  )
              )
        )
        or exists (
            select 1
            from public.tenant_memberships tm
            join public.tenants t
              on t.id = tm.tenant_id
            where auth.uid() is not null
              and tm.user_id = auth.uid()
              and tm.status = 'ativo'
              and t.status = 'ativo'
        );
$function$;

comment on function public.usuario_ativo_sistema() is
'Gate SafeScan de usuario ativo. Preserva usuarios_permissoes_sistema e adiciona membership ativa em tenant ativo.';

revoke all
on function public.usuario_ativo_sistema()
from public;

revoke execute
on function public.usuario_ativo_sistema()
from anon;

grant execute
on function public.usuario_ativo_sistema()
to authenticated, service_role;

-- =============================================================
-- GATE 2
-- usuario_tem_acesso_empresa(uuid)
--
-- Compatibilidade preservada:
--   - administrador global;
--   - auditoria_usuarios_autorizados;
--   - usuarios_permissoes_sistema.empresa_id.
--
-- Novo ramo:
--   empresa -> tenant_id -> usuario_tem_acesso_tenant().
-- =============================================================

create or replace function public.usuario_tem_acesso_empresa(
    p_empresa_id uuid
)
returns boolean
language sql
security definer
set search_path = pg_catalog, public
as $function$
    select
        public.usuario_admin_global()

        or exists (
            select 1
            from public.auditoria_usuarios_autorizados aua
            where aua.user_id = auth.uid()
              and coalesce(aua.ativo, false) = true
              and aua.empresa_id = p_empresa_id
        )

        or exists (
            select 1
            from public.usuarios_permissoes_sistema ups
            where coalesce(ups.ativo, false) = true
              and coalesce(ups.bloqueado, false) = false
              and ups.empresa_id = p_empresa_id
              and (
                  (
                      auth.uid() is not null
                      and ups.user_id = auth.uid()
                  )
                  or (
                      nullif(
                          trim(
                              coalesce(
                                  auth.jwt() ->> 'email',
                                  ''
                              )
                          ),
                          ''
                      ) is not null
                      and lower(
                          coalesce(
                              ups.email,
                              ''
                          )
                      ) = lower(
                          trim(
                              auth.jwt() ->> 'email'
                          )
                      )
                  )
              )
        )

        or exists (
            select 1
            from public.empresas e
            where e.id = p_empresa_id
              and public.usuario_tem_acesso_tenant(
                  e.tenant_id
              )
        );
$function$;

comment on function public.usuario_tem_acesso_empresa(uuid) is
'Gate SafeScan de acesso a empresa. Preserva autorizacoes legadas e adiciona empresa.tenant_id -> usuario_tem_acesso_tenant().';

revoke all
on function public.usuario_tem_acesso_empresa(uuid)
from public;

revoke execute
on function public.usuario_tem_acesso_empresa(uuid)
from anon;

grant execute
on function public.usuario_tem_acesso_empresa(uuid)
to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
