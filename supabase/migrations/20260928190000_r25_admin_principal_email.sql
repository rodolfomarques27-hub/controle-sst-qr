begin;

do $preflight$
declare
    v_oid oid :=
        to_regprocedure(
            'public.admin_listar_tenants_plataforma()'
        );

    v_owner text;
    v_security_definer boolean;
begin
    if v_oid is null then
        raise exception
            'R2.5 preflight: admin_listar_tenants_plataforma() ausente.';
    end if;

    select
        r.rolname,
        p.prosecdef
    into
        v_owner,
        v_security_definer
    from pg_proc p
    join pg_roles r
      on r.oid = p.proowner
    where p.oid = v_oid;

    if v_owner <> 'postgres' then
        raise exception
            'R2.5 preflight: owner inesperado: %.',
            v_owner;
    end if;

    if v_security_definer is not true then
        raise exception
            'R2.5 preflight: RPC não está SECURITY DEFINER.';
    end if;

    if not has_function_privilege(
        'authenticated',
        v_oid,
        'EXECUTE'
    ) then
        raise exception
            'R2.5 preflight: authenticated sem EXECUTE esperado.';
    end if;

    if has_function_privilege(
        'anon',
        v_oid,
        'EXECUTE'
    ) then
        raise exception
            'R2.5 preflight: anon possui EXECUTE inesperado.';
    end if;
end
$preflight$;

drop function
    public.admin_listar_tenants_plataforma();

create function
    public.admin_listar_tenants_plataforma()
returns table(
    tenant_id uuid,
    tenant_nome text,
    tenant_slug text,
    tenant_status text,
    dominio_principal text,
    dominio_status text,
    dominio_verificado boolean,
    dominio_verificado_em timestamptz,
    empresas_total bigint,
    membros_ativos bigint,
    admins_ativos bigint,
    admin_principal_email text,
    possui_branding boolean,
    tenant_created_at timestamptz,
    tenant_updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
    if auth.uid() is null
       or not public.usuario_admin_global() then
        raise exception using
            errcode = '42501',
            message =
                'Listagem global de tenants restrita ao administrador global SafeScan.';
    end if;

    return query
    select
        t.id as tenant_id,
        t.nome as tenant_nome,
        t.slug as tenant_slug,
        t.status as tenant_status,
        d.hostname as dominio_principal,
        d.status as dominio_status,
        (
            d.verificado_em is not null
        ) as dominio_verificado,
        d.verificado_em as dominio_verificado_em,

        (
            select count(*)::bigint
            from public.empresas e
            where e.tenant_id = t.id
        ) as empresas_total,

        (
            select count(*)::bigint
            from public.tenant_memberships tm
            where tm.tenant_id = t.id
              and tm.status = 'ativo'
        ) as membros_ativos,

        (
            select count(*)::bigint
            from public.tenant_memberships tm
            where tm.tenant_id = t.id
              and tm.status = 'ativo'
              and lower(
                    coalesce(
                        tm.papel,
                        ''
                    )
                  ) in (
                    'admin',
                    'administrador'
                  )
        ) as admins_ativos,

        coalesce(
            ap.admin_principal_email,
            ''
        )::text as admin_principal_email,

        exists (
            select 1
            from public.tenant_branding tb
            where tb.tenant_id = t.id
        ) as possui_branding,

        t.created_at as tenant_created_at,
        t.updated_at as tenant_updated_at

    from public.tenants t

    left join lateral (
        select
            td.hostname,
            td.status,
            td.verificado_em
        from public.tenant_domains td
        where td.tenant_id = t.id
          and td.principal = true
        order by
            td.created_at asc,
            td.id asc
        limit 1
    ) d
      on true

    left join lateral (
        select
            coalesce(
                u.email,
                au.email::text,
                ''
            )::text as admin_principal_email

        from public.tenant_memberships tm_admin

        join auth.users au
          on au.id = tm_admin.user_id

        left join lateral (
            select
                ux.email
            from public.usuarios_permissoes_sistema ux
            where ux.user_id = tm_admin.user_id
            order by
                ux.updated_at desc nulls last,
                ux.created_at desc nulls last
            limit 1
        ) u
          on true

        where tm_admin.tenant_id = t.id
          and tm_admin.status = 'ativo'
          and lower(
                coalesce(
                    tm_admin.papel,
                    ''
                )
              ) in (
                'admin',
                'administrador'
              )

        order by
            tm_admin.created_at asc,
            tm_admin.id asc

        limit 1
    ) ap
      on true

    order by
        lower(t.nome),
        t.created_at,
        t.id;
end;
$function$;

alter function
    public.admin_listar_tenants_plataforma()
owner to postgres;

revoke all
on function
    public.admin_listar_tenants_plataforma()
from public, anon, service_role;

grant execute
on function
    public.admin_listar_tenants_plataforma()
to authenticated;

do $postflight$
declare
    v_oid oid :=
        to_regprocedure(
            'public.admin_listar_tenants_plataforma()'
        );

    v_owner text;
    v_security_definer boolean;
    v_result text;
begin
    if v_oid is null then
        raise exception
            'R2.5 postflight: RPC não foi recriado.';
    end if;

    select
        r.rolname,
        p.prosecdef,
        pg_get_function_result(
            p.oid
        )
    into
        v_owner,
        v_security_definer,
        v_result
    from pg_proc p
    join pg_roles r
      on r.oid = p.proowner
    where p.oid = v_oid;

    if v_owner <> 'postgres' then
        raise exception
            'R2.5 postflight: owner não preservado.';
    end if;

    if v_security_definer is not true then
        raise exception
            'R2.5 postflight: SECURITY DEFINER não preservado.';
    end if;

    if position(
        'admin_principal_email text'
        in v_result
    ) = 0 then
        raise exception
            'R2.5 postflight: novo campo não consta no retorno.';
    end if;

    if not has_function_privilege(
        'authenticated',
        v_oid,
        'EXECUTE'
    ) then
        raise exception
            'R2.5 postflight: EXECUTE authenticated não preservado.';
    end if;

    if has_function_privilege(
        'anon',
        v_oid,
        'EXECUTE'
    ) then
        raise exception
            'R2.5 postflight: anon recebeu EXECUTE indevidamente.';
    end if;
end
$postflight$;

commit;