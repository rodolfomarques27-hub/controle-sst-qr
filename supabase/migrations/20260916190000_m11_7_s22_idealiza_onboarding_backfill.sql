-- SafeScan Brasil
-- M11.7 / R186C-3G-S22 — backfill one-off da Idealiza para onboarding V1
-- Escopo: criar somente branding default e dominio principal pendente.
-- Nao cria usuario, membership, DNS/Vercel e nao ativa tenant.

do $migration$
declare
    v_tenant_id uuid;
    v_tenant_status text;
    v_branding_before bigint;
    v_domains_before bigint;
    v_branding_after bigint;
    v_domain_after bigint;
begin
    select
        t.id,
        t.status
    into
        v_tenant_id,
        v_tenant_status
    from public.tenants t
    where t.slug = 'idealiza';

    if not found then
        raise exception 'S22 bloqueada: tenant idealiza nao localizado.';
    end if;

    if v_tenant_status <> 'rascunho' then
        raise exception
            'S22 bloqueada: tenant idealiza deve estar em rascunho; status atual: %.',
            v_tenant_status;
    end if;

    select count(*)
    into v_branding_before
    from public.tenant_branding tb
    where tb.tenant_id = v_tenant_id;

    select count(*)
    into v_domains_before
    from public.tenant_domains td
    where td.tenant_id = v_tenant_id;

    if v_branding_before <> 0 then
        raise exception
            'S22 bloqueada: esperado 0 branding para idealiza; encontrados %.',
            v_branding_before;
    end if;

    if v_domains_before <> 0 then
        raise exception
            'S22 bloqueada: esperado 0 dominios para idealiza; encontrados %.',
            v_domains_before;
    end if;

    if exists (
        select 1
        from public.tenant_domains td
        where td.hostname = 'idealiza.safescanbrasil.com.br'
    ) then
        raise exception
            'S22 bloqueada: hostname idealiza.safescanbrasil.com.br ja existe.';
    end if;

    insert into public.tenant_branding (
        tenant_id
    )
    values (
        v_tenant_id
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
        'idealiza.safescanbrasil.com.br',
        'subdominio',
        true,
        'pendente',
        null
    );

    select count(*)
    into v_branding_after
    from public.tenant_branding tb
    where tb.tenant_id = v_tenant_id;

    select count(*)
    into v_domain_after
    from public.tenant_domains td
    where td.tenant_id = v_tenant_id
      and td.hostname = 'idealiza.safescanbrasil.com.br'
      and td.tipo = 'subdominio'
      and td.principal = true
      and td.status = 'pendente'
      and td.verificado_em is null;

    if v_branding_after <> 1 then
        raise exception
            'S22 falhou: branding final inconsistente; encontrados %.',
            v_branding_after;
    end if;

    if v_domain_after <> 1 then
        raise exception
            'S22 falhou: dominio pendente final inconsistente; encontrados %.',
            v_domain_after;
    end if;
end;
$migration$;
