
begin;

do $$
declare
  v_system_policy_snapshot_md5 text;
  v_legacy_helper_md5 text;
begin
  if to_regprocedure(
    'public.usuario_pode_acessar_auditoria_campo_empresa(uuid)'
  ) is not null then
    raise exception
      'Baseline divergente: helper de Auditoria de Campo já existe.';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname='public'
      and tablename='auditorias_campo'
      and (
        (policyname='auditorias_campo_insert_autorizado'
          and cmd='INSERT'
          and with_check='(usuario_pode_acessar_auditoria() AND (usuario_admin_global() OR usuario_tem_acesso_empresa(empresa_id)))')
        or
        (policyname='auditorias_campo_select_autorizado'
          and cmd='SELECT'
          and qual='(usuario_pode_acessar_auditoria() AND (usuario_admin_global() OR usuario_tem_acesso_empresa(empresa_id)))')
        or
        (policyname='auditorias_campo_update_autorizado'
          and cmd='UPDATE'
          and qual='(usuario_pode_acessar_auditoria() AND (usuario_admin_global() OR usuario_tem_acesso_empresa(empresa_id)))'
          and with_check='(usuario_pode_acessar_auditoria() AND (usuario_admin_global() OR usuario_tem_acesso_empresa(empresa_id)))')
      )
  ) <> 3 then
    raise exception
      'Baseline divergente: policies mutáveis de auditorias_campo.';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname='public'
      and tablename='auditoria_campo_desvios'
      and (
        (policyname='auditoria_campo_desvios_insert_autorizado'
          and cmd='INSERT'
          and with_check='(usuario_pode_acessar_auditoria() AND (usuario_admin_global() OR usuario_tem_acesso_empresa(empresa_id)))')
        or
        (policyname='auditoria_campo_desvios_select_autorizado'
          and cmd='SELECT'
          and qual='(usuario_pode_acessar_auditoria() AND (usuario_admin_global() OR usuario_tem_acesso_empresa(empresa_id)))')
        or
        (policyname='auditoria_campo_desvios_update_autorizado'
          and cmd='UPDATE'
          and qual='(usuario_pode_acessar_auditoria() AND (usuario_admin_global() OR usuario_tem_acesso_empresa(empresa_id)))'
          and with_check='(usuario_pode_acessar_auditoria() AND (usuario_admin_global() OR usuario_tem_acesso_empresa(empresa_id)))')
      )
  ) <> 3 then
    raise exception
      'Baseline divergente: policies mutáveis de auditoria_campo_desvios.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='auditorias_campo'
      and policyname='auditorias_campo_delete_admin'
      and cmd='DELETE'
      and qual='usuario_admin_global()'
      and roles=array['authenticated']::name[]
  ) then
    raise exception
      'Baseline divergente: DELETE de auditorias_campo.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='auditoria_campo_desvios'
      and policyname='auditoria_campo_desvios_delete_admin'
      and cmd='DELETE'
      and qual='usuario_admin_global()'
      and roles=array['authenticated']::name[]
  ) then
    raise exception
      'Baseline divergente: DELETE de auditoria_campo_desvios.';
  end if;

  select md5(
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'tablename',tablename,
          'policyname',policyname,
          'cmd',cmd,
          'roles',roles,
          'qual',qual,
          'with_check',with_check
        )
        order by tablename, policyname
      )::text,
      '[]'
    )
  )
  into v_system_policy_snapshot_md5
  from pg_policies
  where schemaname='public'
    and tablename in (
      'auditoria_sistema',
      'auditoria_sistema_configuracoes',
      'auditoria_usuarios_autorizados'
    );

  if v_system_policy_snapshot_md5 <>
    '3e83c5b30e7bd56ea95168ef5ee97d84'
  then
    raise exception
      'Baseline divergente: policies de Auditoria de Sistema.';
  end if;

  select md5(pg_get_functiondef(p.oid))
  into v_legacy_helper_md5
  from pg_proc p
  join pg_namespace n
    on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='usuario_pode_acessar_auditoria'
    and pg_get_function_identity_arguments(p.oid)=''
  limit 1;

  if v_legacy_helper_md5 <>
    '84a0c92590af3e2f35ef431d8d4a2c1a'
  then
    raise exception
      'Baseline divergente: usuario_pode_acessar_auditoria().';
  end if;
end;
$$;

create function
  public.usuario_pode_acessar_auditoria_campo_empresa(
    p_empresa_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path to
  pg_catalog,
  public,
  auth
as $function$
  select
    public.usuario_admin_global()
    or (
      p_empresa_id is not null
      and public.usuario_tem_acesso_empresa(
        p_empresa_id
      )
      and exists (
        select 1
        from public.empresas empresa
        where empresa.id =
          p_empresa_id
          and empresa.tenant_id
            is not null
          and public.tenant_tem_modulo(
            empresa.tenant_id,
            'auditoria_campo'
          )
      )
    );
$function$;

revoke all
on function
  public.usuario_pode_acessar_auditoria_campo_empresa(uuid)
from public;

revoke execute
on function
  public.usuario_pode_acessar_auditoria_campo_empresa(uuid)
from anon;

grant execute
on function
  public.usuario_pode_acessar_auditoria_campo_empresa(uuid)
to authenticated, service_role;

alter policy
  auditorias_campo_insert_autorizado
on public.auditorias_campo
with check (
  public.usuario_pode_acessar_auditoria_campo_empresa(
    empresa_id
  )
);

alter policy
  auditorias_campo_select_autorizado
on public.auditorias_campo
using (
  public.usuario_pode_acessar_auditoria_campo_empresa(
    empresa_id
  )
);

alter policy
  auditorias_campo_update_autorizado
on public.auditorias_campo
using (
  public.usuario_pode_acessar_auditoria_campo_empresa(
    empresa_id
  )
)
with check (
  public.usuario_pode_acessar_auditoria_campo_empresa(
    empresa_id
  )
);

alter policy
  auditoria_campo_desvios_insert_autorizado
on public.auditoria_campo_desvios
with check (
  public.usuario_pode_acessar_auditoria_campo_empresa(
    empresa_id
  )
);

alter policy
  auditoria_campo_desvios_select_autorizado
on public.auditoria_campo_desvios
using (
  public.usuario_pode_acessar_auditoria_campo_empresa(
    empresa_id
  )
);

alter policy
  auditoria_campo_desvios_update_autorizado
on public.auditoria_campo_desvios
using (
  public.usuario_pode_acessar_auditoria_campo_empresa(
    empresa_id
  )
)
with check (
  public.usuario_pode_acessar_auditoria_campo_empresa(
    empresa_id
  )
);

commit;
