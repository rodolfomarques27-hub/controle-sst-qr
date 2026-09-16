begin;

-- ============================================================
-- SafeScan Brasil
-- M11.5-I1
--
-- Fundação estrutural do vínculo:
--     tenant 1:N empresas
--
-- Escopo desta migration:
--   1. adicionar public.empresas.tenant_id como NULLABLE;
--   2. criar FK para public.tenants(id);
--   3. usar ON DELETE RESTRICT;
--   4. criar índice dedicado;
--   5. não executar backfill;
--   6. não alterar RLS;
--   7. não criar tenant, domínio ou membership.
-- ============================================================

do $preflight$
begin
    if to_regclass('public.empresas') is null then
        raise exception
            'M11.5-I1: tabela public.empresas ausente.';
    end if;

    if to_regclass('public.tenants') is null then
        raise exception
            'M11.5-I1: tabela public.tenants ausente.';
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'empresas'
          and column_name = 'tenant_id'
    ) then
        raise exception
            'M11.5-I1: public.empresas.tenant_id já existe.';
    end if;

    if exists (
        select 1
        from pg_constraint
        where conname = 'empresas_tenant_id_fkey'
          and conrelid = 'public.empresas'::regclass
    ) then
        raise exception
            'M11.5-I1: constraint empresas_tenant_id_fkey já existe.';
    end if;

    if to_regclass(
        'public.empresas_tenant_id_idx'
    ) is not null then
        raise exception
            'M11.5-I1: índice empresas_tenant_id_idx já existe.';
    end if;
end
$preflight$;

alter table public.empresas
    add column tenant_id uuid null;

alter table public.empresas
    add constraint empresas_tenant_id_fkey
    foreign key (tenant_id)
    references public.tenants(id)
    on delete restrict;

create index empresas_tenant_id_idx
    on public.empresas (tenant_id);

comment on column public.empresas.tenant_id is
    'Tenant SafeScan proprietário da empresa operacional. Nullable somente durante a fase controlada de migração M11.5.';

commit;
