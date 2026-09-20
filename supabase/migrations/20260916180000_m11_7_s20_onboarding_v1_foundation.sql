-- SafeScan Brasil
-- M11.7 / R186C-3G-S20 — Onboarding V1 foundation
-- Apenas cria RPCs. Não cria tenant/empresa/domínio durante a migration.

begin;

do $preflight$
begin
    if to_regclass('public.tenants') is null
       or to_regclass('public.empresas') is null
       or to_regclass('public.tenant_branding') is null
       or to_regclass('public.tenant_domains') is null
       or to_regclass('public.tenant_memberships') is null then
        raise exception 'S20: estrutura tenant-aware obrigatória ausente.';
    end if;

    if to_regprocedure('public.usuario_admin_global()') is null then
        raise exception 'S20: usuario_admin_global() ausente.';
    end if;

    if to_regprocedure('public.admin_provisionar_tenant_rascunho(text,text,text,text,text)') is not null
       or to_regprocedure('public.admin_ativar_tenant(uuid)') is not null then
        raise exception 'S20: RPC de onboarding já existe; abortado para evitar colisão.';
    end if;
end;
$preflight$;

create function public.admin_provisionar_tenant_rascunho(
    p_nome_tenant text,
    p_slug text,
    p_empresa_nome text,
    p_hostname text,
    p_empresa_tipo text default 'Contratante'::text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_nome_tenant text := btrim(coalesce(p_nome_tenant, ''));
    v_slug text := lower(btrim(coalesce(p_slug, '')));
    v_empresa_nome text := btrim(coalesce(p_empresa_nome, ''));
    v_hostname text := lower(btrim(coalesce(p_hostname, '')));
    v_empresa_tipo text;
    v_hostname_esperado text;
    v_tenant_id uuid;
    v_empresa_id uuid;
    v_dominio_id uuid;
begin
    if auth.uid() is null or not public.usuario_admin_global() then
        raise exception using
            errcode = '42501',
            message = 'Provisionamento de tenant restrito ao administrador global SafeScan.';
    end if;

    if char_length(v_nome_tenant) not between 2 and 160 then
        raise exception 'Nome do tenant deve possuir entre 2 e 160 caracteres.';
    end if;

    if char_length(v_slug) not between 2 and 63
       or v_slug !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' then
        raise exception 'Slug de tenant inválido.';
    end if;

    if v_slug = any(array[
        'www','app','admin','api','qr','status','assets','static','auth'
    ]::text[]) then
        raise exception 'Slug reservado pela plataforma SafeScan: %.', v_slug;
    end if;

    if char_length(v_empresa_nome) not between 2 and 160 then
        raise exception 'Nome da empresa inicial deve possuir entre 2 e 160 caracteres.';
    end if;

    v_empresa_tipo := case lower(btrim(coalesce(p_empresa_tipo, '')))
        when 'contratante' then 'Contratante'
        when 'terceirizada' then 'Terceirizada'
        when 'subcontratada' then 'Subcontratada'
        else null
    end;

    if v_empresa_tipo is null then
        raise exception 'Tipo da empresa inicial inválido. Use Contratante, Terceirizada ou Subcontratada.';
    end if;

    v_hostname := regexp_replace(v_hostname, '\.$', '');
    v_hostname_esperado := v_slug || '.safescanbrasil.com.br';

    if v_hostname <> v_hostname_esperado then
        raise exception
            'Onboarding V1 exige hostname % para o slug informado.',
            v_hostname_esperado;
    end if;

    if exists (
        select 1
        from public.tenants t
        where t.slug = v_slug
    ) then
        raise exception using
            errcode = '23505',
            message = format('Já existe tenant com o slug %s.', v_slug);
    end if;

    if exists (
        select 1
        from public.tenant_domains d
        where d.hostname = v_hostname
    ) then
        raise exception using
            errcode = '23505',
            message = format('Hostname %s já está associado a um tenant.', v_hostname);
    end if;

    insert into public.tenants (
        nome,
        slug,
        status
    )
    values (
        v_nome_tenant,
        v_slug,
        'rascunho'
    )
    returning id
    into v_tenant_id;

    insert into public.empresas (
        nome,
        status,
        tipo_empresa,
        tenant_id
    )
    values (
        v_empresa_nome,
        'Ativa',
        v_empresa_tipo,
        v_tenant_id
    )
    returning id
    into v_empresa_id;

    insert into public.tenant_branding (
        tenant_id,
        created_by,
        updated_by
    )
    values (
        v_tenant_id,
        auth.uid(),
        auth.uid()
    );

    insert into public.tenant_domains (
        tenant_id,
        hostname,
        tipo,
        principal,
        status,
        verificado_em
    )
    values (
        v_tenant_id,
        v_hostname,
        'subdominio',
        true,
        'pendente',
        null
    )
    returning id
    into v_dominio_id;

    return jsonb_build_object(
        'ok', true,

        'tenant', jsonb_build_object(
            'id', v_tenant_id,
            'nome', v_nome_tenant,
            'slug', v_slug,
            'status', 'rascunho'
        ),

        'empresaInicial', jsonb_build_object(
            'id', v_empresa_id,
            'nome', v_empresa_nome,
            'tipo', v_empresa_tipo
        ),

        'branding', jsonb_build_object(
            'criado', true,
            'tenantId', v_tenant_id
        ),

        'dominio', jsonb_build_object(
            'id', v_dominio_id,
            'hostname', v_hostname,
            'tipo', 'subdominio',
            'principal', true,
            'status', 'pendente',
            'verificado', false
        )
    );
end;
$function$;

comment on function
    public.admin_provisionar_tenant_rascunho(
        text,
        text,
        text,
        text,
        text
    )
is
'Provisiona tenant SafeScan em rascunho com empresa inicial, branding default e subdomínio principal pendente. Não cria Auth user, membership, DNS ou Vercel.';

revoke all
on function
    public.admin_provisionar_tenant_rascunho(
        text,
        text,
        text,
        text,
        text
    )
from public, anon, service_role;

grant execute
on function
    public.admin_provisionar_tenant_rascunho(
        text,
        text,
        text,
        text,
        text
    )
to authenticated;

create function public.admin_ativar_tenant(
    p_tenant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_status_tenant text;
    v_slug text;

    v_empresas bigint := 0;
    v_admins_ativos bigint := 0;
    v_branding bigint := 0;

    v_dominios_principais bigint := 0;
    v_dominios_principais_verificados bigint := 0;
    v_dominios_ativos bigint := 0;
    v_dominios_principais_ativos bigint := 0;

    v_dominio_id uuid;
    v_hostname text;
    v_hostname_esperado text;
begin
    if auth.uid() is null or not public.usuario_admin_global() then
        raise exception using
            errcode = '42501',
            message = 'Ativação de tenant restrita ao administrador global SafeScan.';
    end if;

    if p_tenant_id is null then
        raise exception 'tenant_id é obrigatório para ativação.';
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
        raise exception 'Tenant não localizado para ativação.';
    end if;

    if v_status_tenant not in (
        'rascunho',
        'ativo'
    ) then
        raise exception
            'Tenant em status % não pode ser ativado por este fluxo.',
            v_status_tenant;
    end if;

    select count(*)
    into v_empresas
    from public.empresas e
    where e.tenant_id = p_tenant_id;

    if v_empresas < 1 then
        raise exception 'Ativação bloqueada: tenant sem empresa operacional.';
    end if;

    select count(*)
    into v_admins_ativos
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.status = 'ativo'
      and tm.papel = 'administrador';

    if v_admins_ativos < 1 then
        raise exception 'Ativação bloqueada: tenant sem membership administrativa ativa.';
    end if;

    select count(*)
    into v_branding
    from public.tenant_branding tb
    where tb.tenant_id = p_tenant_id;

    if v_branding <> 1 then
        raise exception 'Ativação bloqueada: branding 1:1 do tenant ausente ou inconsistente.';
    end if;

    select
        count(*) filter (
            where d.principal = true
        ),

        count(*) filter (
            where d.principal = true
              and d.verificado_em is not null
              and d.status in (
                  'pendente',
                  'ativo'
              )
        ),

        count(*) filter (
            where d.status = 'ativo'
        ),

        count(*) filter (
            where d.principal = true
              and d.status = 'ativo'
              and d.verificado_em is not null
        )
    into
        v_dominios_principais,
        v_dominios_principais_verificados,
        v_dominios_ativos,
        v_dominios_principais_ativos
    from public.tenant_domains d
    where d.tenant_id = p_tenant_id;

    if v_dominios_principais <> 1 then
        raise exception
            'Ativação bloqueada: esperado exatamente 1 domínio principal; encontrados %.',
            v_dominios_principais;
    end if;

    if v_dominios_principais_verificados <> 1 then
        raise exception 'Ativação bloqueada: domínio principal ainda não está verificado e elegível.';
    end if;

    select
        d.id,
        d.hostname
    into
        v_dominio_id,
        v_hostname
    from public.tenant_domains d
    where d.tenant_id = p_tenant_id
      and d.principal = true
      and d.verificado_em is not null
      and d.status in (
          'pendente',
          'ativo'
      );

    if not found then
        raise exception 'Ativação bloqueada: domínio principal verificado não localizado.';
    end if;

    v_hostname_esperado :=
        v_slug
        || '.safescanbrasil.com.br';

    if v_hostname <> v_hostname_esperado then
        raise exception
            'Ativação bloqueada: hostname principal % diverge do onboarding V1 esperado %.',
            v_hostname,
            v_hostname_esperado;
    end if;

    if v_status_tenant = 'ativo' then
        if v_dominios_ativos <> 1
           or v_dominios_principais_ativos <> 1 then
            raise exception 'Tenant já ativo possui estado de domínio inconsistente.';
        end if;

        return jsonb_build_object(
            'ok', true,
            'jaAtivo', true,
            'tenantId', p_tenant_id,
            'status', 'ativo',
            'dominioId', v_dominio_id,
            'hostname', v_hostname
        );
    end if;

    if v_dominios_ativos <> 0 then
        raise exception 'Ativação bloqueada: tenant em rascunho já possui domínio ativo inesperado.';
    end if;

    update public.tenant_domains d
    set
        status = 'ativo',
        updated_at = now()
    where d.id = v_dominio_id
      and d.tenant_id = p_tenant_id
      and d.principal = true
      and d.status = 'pendente'
      and d.verificado_em is not null;

    if not found then
        raise exception 'Ativação bloqueada: domínio principal deixou de estar elegível durante a operação.';
    end if;

    update public.tenants t
    set
        status = 'ativo',
        updated_at = now()
    where t.id = p_tenant_id
      and t.status = 'rascunho';

    if not found then
        raise exception 'Ativação bloqueada: tenant deixou de estar em rascunho durante a operação.';
    end if;

    return jsonb_build_object(
        'ok', true,
        'jaAtivo', false,
        'tenantId', p_tenant_id,
        'status', 'ativo',
        'dominioId', v_dominio_id,
        'hostname', v_hostname
    );
end;
$function$;

comment on function
    public.admin_ativar_tenant(uuid)
is
'Ativa tenant e domínio principal após validar empresa, membership administrativa ativa, branding e domínio principal verificado. Restrito ao administrador global SafeScan.';

revoke all
on function
    public.admin_ativar_tenant(uuid)
from public, anon, service_role;

grant execute
on function
    public.admin_ativar_tenant(uuid)
to authenticated;

do $postflight$
declare
    v_provisionar_oid oid;
    v_ativar_oid oid;

    v_provisionar_definer boolean;
    v_ativar_definer boolean;

    v_provisionar_config text[];
    v_ativar_config text[];
begin
    select
        p.oid,
        p.prosecdef,
        p.proconfig
    into
        v_provisionar_oid,
        v_provisionar_definer,
        v_provisionar_config
    from pg_catalog.pg_proc p
    inner join pg_catalog.pg_namespace n
        on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_provisionar_tenant_rascunho'
      and pg_catalog.pg_get_function_identity_arguments(
            p.oid
          ) =
        'p_nome_tenant text, p_slug text, p_empresa_nome text, p_hostname text, p_empresa_tipo text';

    if v_provisionar_oid is null
       or not coalesce(
            v_provisionar_definer,
            false
       )
       or not (
            coalesce(
                v_provisionar_config,
                array[]::text[]
            )
            @> array[
                'search_path=pg_catalog, public, auth'
            ]::text[]
       ) then
        raise exception 'S20 postflight: contrato da RPC de provisionamento inválido.';
    end if;

    select
        p.oid,
        p.prosecdef,
        p.proconfig
    into
        v_ativar_oid,
        v_ativar_definer,
        v_ativar_config
    from pg_catalog.pg_proc p
    inner join pg_catalog.pg_namespace n
        on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_ativar_tenant'
      and pg_catalog.pg_get_function_identity_arguments(
            p.oid
          ) =
        'p_tenant_id uuid';

    if v_ativar_oid is null
       or not coalesce(
            v_ativar_definer,
            false
       )
       or not (
            coalesce(
                v_ativar_config,
                array[]::text[]
            )
            @> array[
                'search_path=pg_catalog, public, auth'
            ]::text[]
       ) then
        raise exception 'S20 postflight: contrato da RPC de ativação inválido.';
    end if;

    if has_function_privilege(
        'anon',
        'public.admin_provisionar_tenant_rascunho(text,text,text,text,text)',
        'EXECUTE'
    )
       or has_function_privilege(
            'service_role',
            'public.admin_provisionar_tenant_rascunho(text,text,text,text,text)',
            'EXECUTE'
       )
       or not has_function_privilege(
            'authenticated',
            'public.admin_provisionar_tenant_rascunho(text,text,text,text,text)',
            'EXECUTE'
       ) then
        raise exception 'S20 postflight: ACL da RPC de provisionamento inválida.';
    end if;

    if has_function_privilege(
        'anon',
        'public.admin_ativar_tenant(uuid)',
        'EXECUTE'
    )
       or has_function_privilege(
            'service_role',
            'public.admin_ativar_tenant(uuid)',
            'EXECUTE'
       )
       or not has_function_privilege(
            'authenticated',
            'public.admin_ativar_tenant(uuid)',
            'EXECUTE'
       ) then
        raise exception 'S20 postflight: ACL da RPC de ativação inválida.';
    end if;
end;
$postflight$;

notify pgrst, 'reload schema';

commit;
