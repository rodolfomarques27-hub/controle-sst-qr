-- SafeScan Brasil
-- M11.6-I3C
-- Imutabilidade de empresas.tenant_id apos a criacao.
--
-- Objetivo:
--   impedir que uma empresa existente seja reassociada silenciosamente
--   de um tenant para outro por UPDATE direto ou fluxo generico.
--
-- Nao altera:
--   - INSERT de novas empresas;
--   - edicao de nome, CNPJ, contatos, contrato, status, logo etc.;
--   - policies RLS;
--   - dados existentes;
--   - Storage;
--   - frontend;
--   - Edge Functions;
--   - status de tenant.
--
-- Uma eventual transferencia entre tenants devera ser implementada
-- futuramente por operacao administrativa explicita e auditada.

begin;

-- =============================================================
-- PREFLIGHT
-- =============================================================

do $preflight$
declare
    v_nullable text;
    v_empresas_sem_tenant bigint;
    v_tenants_ativos bigint;
    v_fallbacks bigint;
    v_policies_empresas bigint;
    v_triggers_tenant bigint;
begin
    if to_regclass('public.empresas') is null then
        raise exception
            'M11.6-I3C: tabela public.empresas ausente.';
    end if;

    select c.is_nullable
    into v_nullable
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'empresas'
      and c.column_name = 'tenant_id';

    if v_nullable is null then
        raise exception
            'M11.6-I3C: coluna empresas.tenant_id ausente.';
    end if;

    if v_nullable <> 'NO' then
        raise exception
            'M11.6-I3C: empresas.tenant_id deveria estar NOT NULL.';
    end if;

    select count(*)
    into v_empresas_sem_tenant
    from public.empresas
    where tenant_id is null;

    if v_empresas_sem_tenant <> 0 then
        raise exception
            'M11.6-I3C: existem % empresas sem tenant_id.',
            v_empresas_sem_tenant;
    end if;

    select count(*)
    into v_tenants_ativos
    from public.tenants
    where status = 'ativo';

    if v_tenants_ativos <> 0 then
        raise exception
            'M11.6-I3C: esperado 0 tenant ativo; encontrados %.',
            v_tenants_ativos;
    end if;

    select count(*)
    into v_fallbacks
    from pg_policies
    where schemaname = 'public'
      and (
          coalesce(qual, '') ilike
              '%usuario_tem_escopo_empresa_atribuido%'
          or
          coalesce(with_check, '') ilike
              '%usuario_tem_escopo_empresa_atribuido%'
      );

    if v_fallbacks <> 0 then
        raise exception
            'M11.6-I3C: ainda existem % fallbacks legados.',
            v_fallbacks;
    end if;

    select count(*)
    into v_policies_empresas
    from pg_policies
    where schemaname = 'public'
      and tablename = 'empresas';

    if v_policies_empresas <> 3 then
        raise exception
            'M11.6-I3C: esperado 3 policies em empresas; encontradas %.',
            v_policies_empresas;
    end if;

    if to_regprocedure(
        'public.empresas_bloquear_reassociacao_tenant()'
    ) is not null then
        raise exception
            'M11.6-I3C: funcao de protecao ja existe.';
    end if;

    select count(*)
    into v_triggers_tenant
    from pg_trigger tg
    join pg_class c
      on c.oid = tg.tgrelid
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'empresas'
      and not tg.tgisinternal
      and (
          tg.tgname =
              'trg_empresas_tenant_id_imutavel'
          or
          pg_get_triggerdef(tg.oid)
              ilike '%UPDATE OF tenant_id%'
      );

    if v_triggers_tenant <> 0 then
        raise exception
            'M11.6-I3C: ja existe trigger relacionado a UPDATE de tenant_id.';
    end if;
end;
$preflight$;

-- =============================================================
-- FUNCAO DE TRIGGER
-- =============================================================

create function public.empresas_bloquear_reassociacao_tenant()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
    if old.tenant_id is distinct from new.tenant_id then
        raise exception using
            errcode = '42501',
            message =
                'A reassociacao de tenant da empresa nao e permitida.',
            detail =
                format(
                    'Empresa %s deve permanecer vinculada ao tenant original.',
                    old.id
                ),
            hint =
                'Uma eventual transferencia entre tenants exige operacao administrativa especifica e auditada.';
    end if;

    return new;
end;
$function$;

comment on function
    public.empresas_bloquear_reassociacao_tenant()
is
    'M11.6-I3C: bloqueia alteracao de empresas.tenant_id apos INSERT.';

revoke all
on function public.empresas_bloquear_reassociacao_tenant()
from public;

revoke all
on function public.empresas_bloquear_reassociacao_tenant()
from anon;

revoke all
on function public.empresas_bloquear_reassociacao_tenant()
from authenticated;

grant execute
on function public.empresas_bloquear_reassociacao_tenant()
to service_role;

-- =============================================================
-- TRIGGER
-- =============================================================

create trigger trg_empresas_tenant_id_imutavel
before update of tenant_id
on public.empresas
for each row
execute function
    public.empresas_bloquear_reassociacao_tenant();

-- =============================================================
-- POSTFLIGHT
-- =============================================================

do $postflight$
declare
    v_funcao_oid oid;
    v_security_definer boolean;
    v_config text[];
    v_trigger_total bigint;
    v_policies_empresas bigint;
    v_fallbacks bigint;
begin
    select
        p.oid,
        p.prosecdef,
        p.proconfig
    into
        v_funcao_oid,
        v_security_definer,
        v_config
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname =
          'empresas_bloquear_reassociacao_tenant'
      and pg_get_function_identity_arguments(
          p.oid
      ) = '';

    if v_funcao_oid is null then
        raise exception
            'M11.6-I3C: funcao de protecao nao foi criada.';
    end if;

    if coalesce(v_security_definer, false) is not true then
        raise exception
            'M11.6-I3C: funcao deveria ser SECURITY DEFINER.';
    end if;

    if not (
        coalesce(v_config, array[]::text[])
        @> array['search_path=pg_catalog, public']::text[]
    ) then
        raise exception
            'M11.6-I3C: search_path da funcao divergente.';
    end if;

    if has_function_privilege(
        'anon',
        'public.empresas_bloquear_reassociacao_tenant()',
        'EXECUTE'
    ) then
        raise exception
            'M11.6-I3C: anon nao pode executar a funcao.';
    end if;

    if has_function_privilege(
        'authenticated',
        'public.empresas_bloquear_reassociacao_tenant()',
        'EXECUTE'
    ) then
        raise exception
            'M11.6-I3C: authenticated nao pode executar a funcao.';
    end if;

    if not has_function_privilege(
        'service_role',
        'public.empresas_bloquear_reassociacao_tenant()',
        'EXECUTE'
    ) then
        raise exception
            'M11.6-I3C: service_role deveria manter EXECUTE.';
    end if;

    select count(*)
    into v_trigger_total
    from pg_trigger tg
    join pg_class c
      on c.oid = tg.tgrelid
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'empresas'
      and tg.tgname =
          'trg_empresas_tenant_id_imutavel'
      and not tg.tgisinternal
      and tg.tgenabled = 'O'
      and pg_get_triggerdef(tg.oid)
          ilike '%BEFORE UPDATE OF tenant_id%'
      and pg_get_triggerdef(tg.oid)
          ilike '%empresas_bloquear_reassociacao_tenant%';

    if v_trigger_total <> 1 then
        raise exception
            'M11.6-I3C: trigger esperado nao foi validado.';
    end if;

    select count(*)
    into v_policies_empresas
    from pg_policies
    where schemaname = 'public'
      and tablename = 'empresas';

    if v_policies_empresas <> 3 then
        raise exception
            'M11.6-I3C: policies de empresas foram alteradas indevidamente.';
    end if;

    select count(*)
    into v_fallbacks
    from pg_policies
    where schemaname = 'public'
      and (
          coalesce(qual, '') ilike
              '%usuario_tem_escopo_empresa_atribuido%'
          or
          coalesce(with_check, '') ilike
              '%usuario_tem_escopo_empresa_atribuido%'
      );

    if v_fallbacks <> 0 then
        raise exception
            'M11.6-I3C: fallback legado reapareceu.';
    end if;
end;
$postflight$;

commit;
