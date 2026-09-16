-- SafeScan Brasil
-- M11.7 / S23 — verificacao administrativa de dominio do tenant
-- Escopo:
--   1) registrar verificado_em de forma auditavel;
--   2) manter o dominio pendente ate admin_ativar_tenant;
--   3) restringir a operacao ao administrador global SafeScan.

create or replace function public.admin_verificar_dominio_tenant(
    p_tenant_id uuid,
    p_hostname text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
    v_status_tenant text;
    v_slug text;

    v_hostname text :=
        lower(
            btrim(
                coalesce(
                    p_hostname,
                    ''
                )
            )
        );

    v_hostname_esperado text;

    v_dominios_principais bigint := 0;

    v_dominio_id uuid;
    v_dominio_status text;
    v_verificado_em timestamptz;
begin
    if auth.uid() is null
       or not public.usuario_admin_global() then
        raise exception using
            errcode = '42501',
            message =
                'Verificacao de dominio restrita ao administrador global SafeScan.';
    end if;

    if p_tenant_id is null then
        raise exception
            'tenant_id e obrigatorio para verificar dominio.';
    end if;

    v_hostname :=
        regexp_replace(
            v_hostname,
            '\.$',
            ''
        );

    if v_hostname = ''
       or char_length(v_hostname) not between 3 and 253
       or v_hostname !~
            '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$' then
        raise exception
            'Hostname invalido para verificacao de dominio.';
    end if;

    select
        t.status,
        t.slug
    into
        v_status_tenant,
        v_slug
    from public.tenants t
    where t.id = p_tenant_id
    for update;

    if not found then
        raise exception
            'Tenant nao localizado para verificacao de dominio.';
    end if;

    if v_status_tenant not in (
        'rascunho',
        'ativo'
    ) then
        raise exception
            'Tenant em status % nao pode ter dominio verificado por este fluxo.',
            v_status_tenant;
    end if;

    v_hostname_esperado :=
        v_slug
        || '.safescanbrasil.com.br';

    if v_hostname <> v_hostname_esperado then
        raise exception
            'Hostname % diverge do onboarding V1 esperado %.',
            v_hostname,
            v_hostname_esperado;
    end if;

    select count(*)
    into v_dominios_principais
    from public.tenant_domains d
    where d.tenant_id = p_tenant_id
      and d.principal = true;

    if v_dominios_principais <> 1 then
        raise exception
            'Verificacao bloqueada: esperado exatamente 1 dominio principal; encontrados %.',
            v_dominios_principais;
    end if;

    select
        d.id,
        d.status,
        d.verificado_em
    into
        v_dominio_id,
        v_dominio_status,
        v_verificado_em
    from public.tenant_domains d
    where d.tenant_id = p_tenant_id
      and d.principal = true
      and d.hostname = v_hostname
    for update;

    if not found then
        raise exception
            'Dominio principal do tenant nao corresponde ao hostname informado.';
    end if;

    if v_dominio_status not in (
        'pendente',
        'ativo'
    ) then
        raise exception
            'Dominio em status % nao pode ser verificado por este fluxo.',
            v_dominio_status;
    end if;

    if v_verificado_em is not null then
        return jsonb_build_object(
            'ok', true,
            'jaVerificado', true,
            'tenantId', p_tenant_id,
            'tenantStatus', v_status_tenant,
            'dominioId', v_dominio_id,
            'hostname', v_hostname,
            'dominioStatus', v_dominio_status,
            'verificadoEm', v_verificado_em
        );
    end if;

    update public.tenant_domains d
    set
        verificado_em = now(),
        updated_at = now()
    where d.id = v_dominio_id
      and d.tenant_id = p_tenant_id
      and d.principal = true
      and d.hostname = v_hostname
      and d.status = 'pendente'
      and d.verificado_em is null
    returning d.verificado_em
    into v_verificado_em;

    if not found then
        raise exception
            'Verificacao bloqueada: dominio deixou de estar elegivel durante a operacao.';
    end if;

    return jsonb_build_object(
        'ok', true,
        'jaVerificado', false,
        'tenantId', p_tenant_id,
        'tenantStatus', v_status_tenant,
        'dominioId', v_dominio_id,
        'hostname', v_hostname,
        'dominioStatus', 'pendente',
        'verificadoEm', v_verificado_em
    );
end;
$function$;

revoke all
on function public.admin_verificar_dominio_tenant(uuid, text)
from public;

revoke execute
on function public.admin_verificar_dominio_tenant(uuid, text)
from anon;

revoke execute
on function public.admin_verificar_dominio_tenant(uuid, text)
from service_role;

grant execute
on function public.admin_verificar_dominio_tenant(uuid, text)
to authenticated;

comment on function public.admin_verificar_dominio_tenant(uuid, text)
is
'Registra a verificacao administrativa do dominio principal de um tenant apos validacao externa de DNS/HTTPS. Nao ativa dominio nem tenant.';

do $validation$
begin
    if not exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'admin_verificar_dominio_tenant'
          and pg_get_function_identity_arguments(p.oid) =
              'p_tenant_id uuid, p_hostname text'
          and p.prosecdef = true
    ) then
        raise exception
            'Validacao S23 falhou: RPC admin_verificar_dominio_tenant ausente ou sem SECURITY DEFINER.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.admin_verificar_dominio_tenant(uuid,text)',
        'EXECUTE'
    ) then
        raise exception
            'Validacao S23 falhou: authenticated sem EXECUTE.';
    end if;

    if has_function_privilege(
        'anon',
        'public.admin_verificar_dominio_tenant(uuid,text)',
        'EXECUTE'
    ) then
        raise exception
            'Validacao S23 falhou: anon possui EXECUTE.';
    end if;

    if has_function_privilege(
        'service_role',
        'public.admin_verificar_dominio_tenant(uuid,text)',
        'EXECUTE'
    ) then
        raise exception
            'Validacao S23 falhou: service_role possui EXECUTE.';
    end if;
end;
$validation$;
