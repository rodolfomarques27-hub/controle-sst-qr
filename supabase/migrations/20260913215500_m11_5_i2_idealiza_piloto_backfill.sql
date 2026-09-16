begin;

lock table public.tenants
    in share row exclusive mode;

lock table public.tenant_domains
    in share row exclusive mode;

lock table public.empresas
    in share row exclusive mode;

lock table public.tenant_memberships
    in share row exclusive mode;

lock table public.usuarios_permissoes_sistema
    in share mode;

create temporary table m11_5_i2_empresas_pai_snapshot
on commit drop
as
select
    id,
    empresa_pai_id
from public.empresas;

do $m11_5_i2$
declare
    v_tenant_id uuid;
    v_empresa_idealiza_id uuid;
    v_user_id uuid;
    v_qtd bigint;
    v_atualizadas bigint;
begin

    -- ========================================================
    -- PRECHECK ESTRUTURAL
    -- ========================================================

    if to_regclass('public.tenants') is null then
        raise exception 'M11.5-I2: public.tenants ausente.';
    end if;

    if to_regclass('public.tenant_domains') is null then
        raise exception 'M11.5-I2: public.tenant_domains ausente.';
    end if;

    if to_regclass('public.empresas') is null then
        raise exception 'M11.5-I2: public.empresas ausente.';
    end if;

    if to_regclass('public.tenant_memberships') is null then
        raise exception 'M11.5-I2: public.tenant_memberships ausente.';
    end if;

    if to_regclass('public.usuarios_permissoes_sistema') is null then
        raise exception 'M11.5-I2: public.usuarios_permissoes_sistema ausente.';
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'empresas'
          and column_name = 'tenant_id'
          and data_type = 'uuid'
    ) then
        raise exception 'M11.5-I2: empresas.tenant_id uuid ausente.';
    end if;

    -- ========================================================
    -- ESTADO ANTES DO BACKFILL
    -- ========================================================

    select count(*)
    into v_qtd
    from public.tenants;

    if v_qtd <> 0 then
        raise exception
            'M11.5-I2: esperado 0 tenants; encontrado %.',
            v_qtd;
    end if;

    select count(*)
    into v_qtd
    from public.tenant_domains;

    if v_qtd <> 0 then
        raise exception
            'M11.5-I2: esperado 0 tenant_domains; encontrado %.',
            v_qtd;
    end if;

    select count(*)
    into v_qtd
    from public.tenant_memberships;

    if v_qtd <> 0 then
        raise exception
            'M11.5-I2: esperado 0 memberships; encontrado %.',
            v_qtd;
    end if;

    select count(*)
    into v_qtd
    from public.empresas;

    if v_qtd <> 9 then
        raise exception
            'M11.5-I2: esperado exatamente 9 empresas; encontrado %.',
            v_qtd;
    end if;

    select count(*)
    into v_qtd
    from public.empresas
    where tenant_id is not null;

    if v_qtd <> 0 then
        raise exception
            'M11.5-I2: existem % empresas ja vinculadas a tenant.',
            v_qtd;
    end if;

    -- ========================================================
    -- IDEALIZA
    -- ========================================================

    select count(*)
    into v_qtd
    from public.empresas
    where upper(btrim(nome)) = 'IDEALIZA CIDADES';

    if v_qtd <> 1 then
        raise exception
            'M11.5-I2: esperado 1 cadastro IDEALIZA CIDADES; encontrado %.',
            v_qtd;
    end if;

    select id
    into v_empresa_idealiza_id
    from public.empresas
    where upper(btrim(nome)) = 'IDEALIZA CIDADES';

    -- ========================================================
    -- TECNICO SST ATIVO DA IDEALIZA
    -- ========================================================

    select count(*)
    into v_qtd
    from public.usuarios_permissoes_sistema p
    where p.perfil = 'tecnico_sst'
      and p.ativo is true
      and p.bloqueado is false
      and coalesce(p.acesso_global, false) is false
      and p.empresa_id = v_empresa_idealiza_id
      and p.user_id is not null;

    if v_qtd <> 1 then
        raise exception
            'M11.5-I2: esperado 1 tecnico_sst ativo da Idealiza; encontrado %.',
            v_qtd;
    end if;

    select p.user_id
    into v_user_id
    from public.usuarios_permissoes_sistema p
    where p.perfil = 'tecnico_sst'
      and p.ativo is true
      and p.bloqueado is false
      and coalesce(p.acesso_global, false) is false
      and p.empresa_id = v_empresa_idealiza_id
      and p.user_id is not null;

    -- ========================================================
    -- TENANT PILOTO
    -- ========================================================

    insert into public.tenants (
        nome,
        slug,
        status
    )
    values (
        'Idealiza Cidades',
        'idealiza',
        'rascunho'
    )
    returning id
    into v_tenant_id;

    -- ========================================================
    -- 9 EMPRESAS
    -- ========================================================

    update public.empresas
    set tenant_id = v_tenant_id
    where tenant_id is null;

    get diagnostics v_atualizadas = row_count;

    if v_atualizadas <> 9 then
        raise exception
            'M11.5-I2: esperado atualizar 9 empresas; atualizado %.',
            v_atualizadas;
    end if;

    -- ========================================================
    -- MEMBERSHIP UNICA
    -- ========================================================

    insert into public.tenant_memberships (
        tenant_id,
        user_id,
        papel,
        status,
        permissoes
    )
    values (
        v_tenant_id,
        v_user_id,
        'tecnico_sst',
        'ativo',
        '{}'::jsonb
    );

    -- ========================================================
    -- POS-CHECKS
    -- ========================================================

    select count(*)
    into v_qtd
    from public.tenants
    where id = v_tenant_id
      and nome = 'Idealiza Cidades'
      and slug = 'idealiza'
      and status = 'rascunho';

    if v_qtd <> 1 then
        raise exception 'M11.5-I2: tenant piloto divergente.';
    end if;

    select count(*)
    into v_qtd
    from public.empresas
    where tenant_id = v_tenant_id;

    if v_qtd <> 9 then
        raise exception
            'M11.5-I2: esperado 9 empresas no tenant; encontrado %.',
            v_qtd;
    end if;

    if exists (
        select 1
        from public.empresas e
        join pg_temp.m11_5_i2_empresas_pai_snapshot s
          on s.id = e.id
        where e.empresa_pai_id is distinct from s.empresa_pai_id
    ) then
        raise exception
            'M11.5-I2: empresa_pai_id foi alterado.';
    end if;

    if exists (
        select 1
        from public.empresas filha
        join public.empresas pai
          on pai.id = filha.empresa_pai_id
        where filha.empresa_pai_id is not null
          and filha.tenant_id is distinct from pai.tenant_id
    ) then
        raise exception
            'M11.5-I2: relacao pai/filha cruzou tenants.';
    end if;

    select count(*)
    into v_qtd
    from public.tenant_memberships;

    if v_qtd <> 1 then
        raise exception
            'M11.5-I2: esperado 1 membership; encontrado %.',
            v_qtd;
    end if;

    select count(*)
    into v_qtd
    from public.tenant_memberships
    where tenant_id = v_tenant_id
      and user_id = v_user_id
      and papel = 'tecnico_sst'
      and status = 'ativo';

    if v_qtd <> 1 then
        raise exception
            'M11.5-I2: membership tecnico_sst divergente.';
    end if;

    if exists (
        select 1
        from public.tenant_domains
    ) then
        raise exception
            'M11.5-I2: dominio inesperado localizado.';
    end if;

end
$m11_5_i2$;

commit;
