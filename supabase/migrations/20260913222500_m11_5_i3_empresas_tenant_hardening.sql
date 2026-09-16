begin;

-- ============================================================
-- SafeScan Brasil
-- M11.5-I3
--
-- Endurecimento da fronteira tenant -> empresas.
--
-- Escopo:
--   1. validar que todas as empresas possuem tenant_id;
--   2. tornar public.empresas.tenant_id NOT NULL;
--   3. impedir hierarquia empresa_pai_id entre tenants distintos;
--   4. impedir troca de tenant_id que rompa a hierarquia;
--   5. preservar a FK atual de empresa_pai_id e seu
--      comportamento ON DELETE SET NULL;
--   6. não alterar RLS, memberships, tenant, domínio ou Auth.
-- ============================================================

lock table public.empresas
    in share row exclusive mode;

do $preflight$
declare
    v_qtd bigint;
    v_not_null boolean;
    v_definicao text;
begin
    if to_regclass('public.empresas') is null then
        raise exception
            'M11.5-I3: public.empresas ausente.';
    end if;

    if to_regclass('public.tenants') is null then
        raise exception
            'M11.5-I3: public.tenants ausente.';
    end if;

    select count(*)
    into v_qtd
    from public.empresas;

    if v_qtd <> 9 then
        raise exception
            'M11.5-I3: esperado exatamente 9 empresas; encontrado %.',
            v_qtd;
    end if;

    select count(*)
    into v_qtd
    from public.empresas
    where tenant_id is null;

    if v_qtd <> 0 then
        raise exception
            'M11.5-I3: existem % empresas sem tenant_id.',
            v_qtd;
    end if;

    select a.attnotnull
    into v_not_null
    from pg_attribute a
    where a.attrelid = 'public.empresas'::regclass
      and a.attname = 'tenant_id'
      and not a.attisdropped;

    if v_not_null is null then
        raise exception
            'M11.5-I3: coluna empresas.tenant_id ausente.';
    end if;

    if v_not_null then
        raise exception
            'M11.5-I3: empresas.tenant_id ja esta NOT NULL.';
    end if;

    select count(*)
    into v_qtd
    from public.empresas filha
    join public.empresas pai
      on pai.id = filha.empresa_pai_id
    where filha.empresa_pai_id is not null
      and filha.tenant_id is distinct from pai.tenant_id;

    if v_qtd <> 0 then
        raise exception
            'M11.5-I3: existem % relacoes pai/filha cruzando tenants.',
            v_qtd;
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.empresas'::regclass
          and conname = 'empresas_tenant_id_fkey'
    ) then
        raise exception
            'M11.5-I3: empresas_tenant_id_fkey ausente.';
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.empresas'::regclass
          and conname = 'empresas_empresa_pai_id_fkey'
    ) then
        raise exception
            'M11.5-I3: empresas_empresa_pai_id_fkey ausente.';
    end if;

    select pg_get_constraintdef(oid)
    into v_definicao
    from pg_constraint
    where conrelid = 'public.empresas'::regclass
      and conname = 'empresas_empresa_pai_id_fkey';

    if position(
        'ON DELETE SET NULL'
        in upper(v_definicao)
    ) = 0 then
        raise exception
            'M11.5-I3: FK empresa_pai_id perdeu ON DELETE SET NULL.';
    end if;

    if exists (
        select 1
        from pg_constraint
        where conrelid = 'public.empresas'::regclass
          and conname = 'empresas_tenant_id_id_key'
    ) then
        raise exception
            'M11.5-I3: empresas_tenant_id_id_key ja existe.';
    end if;

    if exists (
        select 1
        from pg_constraint
        where conrelid = 'public.empresas'::regclass
          and conname = 'empresas_tenant_empresa_pai_fkey'
    ) then
        raise exception
            'M11.5-I3: empresas_tenant_empresa_pai_fkey ja existe.';
    end if;
end
$preflight$;

-- ============================================================
-- TENANT OBRIGATORIO
-- ============================================================

alter table public.empresas
    alter column tenant_id
    set not null;

-- ============================================================
-- CHAVE DECLARATIVA PARA A HIERARQUIA NO MESMO TENANT
--
-- id continua sendo PK global.
-- Esta UNIQUE existe para permitir a FK composta abaixo.
-- ============================================================

alter table public.empresas
    add constraint empresas_tenant_id_id_key
    unique (tenant_id, id);

-- ============================================================
-- FK COMPOSTA
--
-- A filha somente pode apontar para:
--   mesmo tenant_id + id do pai.
--
-- ON DELETE SET NULL atua apenas sobre empresa_pai_id,
-- preservando tenant_id NOT NULL.
--
-- A FK simples antiga permanece existente e continua
-- preservando o contrato historico do sistema.
-- ============================================================

alter table public.empresas
    add constraint empresas_tenant_empresa_pai_fkey
    foreign key (
        tenant_id,
        empresa_pai_id
    )
    references public.empresas (
        tenant_id,
        id
    )
    on delete set null (
        empresa_pai_id
    );

-- ============================================================
-- POS-CHECK
-- ============================================================

do $poscheck$
declare
    v_qtd bigint;
    v_not_null boolean;
    v_definicao text;
begin
    select a.attnotnull
    into v_not_null
    from pg_attribute a
    where a.attrelid = 'public.empresas'::regclass
      and a.attname = 'tenant_id'
      and not a.attisdropped;

    if v_not_null is distinct from true then
        raise exception
            'M11.5-I3: tenant_id nao ficou NOT NULL.';
    end if;

    select count(*)
    into v_qtd
    from public.empresas
    where tenant_id is null;

    if v_qtd <> 0 then
        raise exception
            'M11.5-I3: empresa sem tenant apos endurecimento.';
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.empresas'::regclass
          and conname = 'empresas_tenant_id_id_key'
          and convalidated
    ) then
        raise exception
            'M11.5-I3: unique tenant/id nao validada.';
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.empresas'::regclass
          and conname = 'empresas_tenant_empresa_pai_fkey'
          and convalidated
    ) then
        raise exception
            'M11.5-I3: FK composta nao validada.';
    end if;

    select pg_get_constraintdef(oid)
    into v_definicao
    from pg_constraint
    where conrelid = 'public.empresas'::regclass
      and conname = 'empresas_empresa_pai_id_fkey';

    if position(
        'ON DELETE SET NULL'
        in upper(v_definicao)
    ) = 0 then
        raise exception
            'M11.5-I3: FK original empresa_pai_id foi alterada.';
    end if;

    select count(*)
    into v_qtd
    from public.empresas filha
    join public.empresas pai
      on pai.id = filha.empresa_pai_id
    where filha.empresa_pai_id is not null
      and filha.tenant_id is distinct from pai.tenant_id;

    if v_qtd <> 0 then
        raise exception
            'M11.5-I3: relacao cruzada localizada no pos-check.';
    end if;
end
$poscheck$;

commit;
