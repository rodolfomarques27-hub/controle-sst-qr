-- ============================================================================
-- SafeScan Brasil
-- M11.3 / I2A — Resolver seguro de contexto de tenant por hostname
--
-- Objetivo:
-- - resolver somente contexto público mínimo de tenant por hostname;
-- - manter public.tenant_domains fechada para leitura direta;
-- - permitir resolução antes da autenticação por RPC controlada;
-- - não usar hostname como autorização;
-- - não criar tenant, domínio, membership ou backfill;
-- - não ativar gate global no frontend nesta etapa.
-- ============================================================================

begin;

-- ============================================================================
-- PREFLIGHT
-- ============================================================================

do $preflight$
declare
    v_tenants_rls boolean;
    v_domains_rls boolean;
begin
    if to_regclass('public.tenants') is null then
        raise exception
            'Tabela obrigatória public.tenants não localizada.';
    end if;

    if to_regclass('public.tenant_domains') is null then
        raise exception
            'Tabela obrigatória public.tenant_domains não localizada.';
    end if;

    if to_regprocedure(
        'public.resolver_contexto_tenant_por_hostname(text)'
    ) is not null then
        raise exception
            'RPC public.resolver_contexto_tenant_por_hostname(text) já existe. I2A abortada para evitar colisão.';
    end if;

    select
        c.relrowsecurity
    into
        v_tenants_rls
    from pg_catalog.pg_class c
    where c.oid =
        'public.tenants'::regclass;

    if not coalesce(
        v_tenants_rls,
        false
    ) then
        raise exception
            'public.tenants está sem RLS. I2A abortada.';
    end if;

    select
        c.relrowsecurity
    into
        v_domains_rls
    from pg_catalog.pg_class c
    where c.oid =
        'public.tenant_domains'::regclass;

    if not coalesce(
        v_domains_rls,
        false
    ) then
        raise exception
            'public.tenant_domains está sem RLS. I2A abortada.';
    end if;
end;
$preflight$;

-- ============================================================================
-- RPC PÚBLICA CONTROLADA
-- ============================================================================
--
-- IMPORTANTE:
-- Esta função resolve CONTEXTO, não AUTORIZAÇÃO.
--
-- O retorno de tenant_id jamais substitui:
-- - membership;
-- - RLS;
-- - token público;
-- - autorização do usuário;
-- - associação real do recurso consultado.
--
-- Domínios/tenants suspensos, inativos, pendentes ou não verificados
-- são indistinguíveis de hostname inexistente para o consumidor.
-- ============================================================================

create function
    public.resolver_contexto_tenant_por_hostname(
        p_hostname text
    )
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_hostname text;

    v_tenant_id uuid;
    v_tenant_slug text;
    v_tenant_nome text;

    v_dominio_tipo text;
    v_dominio_principal boolean;
begin
    v_hostname :=
        lower(
            btrim(
                coalesce(
                    p_hostname,
                    ''
                )
            )
        );

    -- FQDN absoluto pode chegar com ponto terminal.
    v_hostname :=
        regexp_replace(
            v_hostname,
            '\.$',
            ''
        );

    if (
        v_hostname = ''
        or char_length(v_hostname) not between 3 and 253
        or v_hostname !~
            '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    ) then
        return jsonb_build_object(
            'estado',
                'unknown-host',

            'hostname',
                v_hostname,

            'tenant',
                null,

            'dominio',
                null
        );
    end if;

    select
        t.id,
        t.slug,
        t.nome,
        d.tipo,
        d.principal
    into
        v_tenant_id,
        v_tenant_slug,
        v_tenant_nome,
        v_dominio_tipo,
        v_dominio_principal
    from public.tenant_domains d
    inner join public.tenants t
        on t.id = d.tenant_id
    where d.hostname = v_hostname
      and d.status = 'ativo'
      and d.verificado_em is not null
      and t.status = 'ativo'
    limit 1;

    if not found then
        return jsonb_build_object(
            'estado',
                'unknown-host',

            'hostname',
                v_hostname,

            'tenant',
                null,

            'dominio',
                null
        );
    end if;

    return jsonb_build_object(
        'estado',
            'resolved',

        'hostname',
            v_hostname,

        'tenant',
            jsonb_build_object(
                'id',
                    v_tenant_id,

                'slug',
                    v_tenant_slug,

                'nome',
                    v_tenant_nome
            ),

        'dominio',
            jsonb_build_object(
                'tipo',
                    v_dominio_tipo,

                'principal',
                    v_dominio_principal
            )
    );
end;
$function$;

comment on function
    public.resolver_contexto_tenant_por_hostname(text)
is
'Resolve contexto público mínimo de tenant para hostname ativo e verificado. Hostname é somente contexto/roteamento e nunca constitui autorização.';

-- PostgreSQL concede EXECUTE de função a PUBLIC por padrão.
-- Removemos esse default e liberamos somente papéis explicitamente previstos.

revoke all
on function
    public.resolver_contexto_tenant_por_hostname(text)
from public;

grant execute
on function
    public.resolver_contexto_tenant_por_hostname(text)
to anon, authenticated, service_role;

-- ============================================================================
-- POSTFLIGHT
-- ============================================================================

do $postflight$
declare
    v_security_definer boolean;
    v_volatility "char";
begin
    if to_regprocedure(
        'public.resolver_contexto_tenant_por_hostname(text)'
    ) is null then
        raise exception
            'Postflight I2A: RPC não foi criada.';
    end if;

    select
        p.prosecdef,
        p.provolatile
    into
        v_security_definer,
        v_volatility
    from pg_catalog.pg_proc p
    where p.oid =
        to_regprocedure(
            'public.resolver_contexto_tenant_por_hostname(text)'
        );

    if not coalesce(
        v_security_definer,
        false
    ) then
        raise exception
            'Postflight I2A: RPC não está SECURITY DEFINER.';
    end if;

    if v_volatility <> 's' then
        raise exception
            'Postflight I2A: RPC não está marcada como STABLE.';
    end if;

    if not has_function_privilege(
        'anon',
        'public.resolver_contexto_tenant_por_hostname(text)',
        'EXECUTE'
    ) then
        raise exception
            'Postflight I2A: anon sem EXECUTE na RPC.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.resolver_contexto_tenant_por_hostname(text)',
        'EXECUTE'
    ) then
        raise exception
            'Postflight I2A: authenticated sem EXECUTE na RPC.';
    end if;

    if not has_function_privilege(
        'service_role',
        'public.resolver_contexto_tenant_por_hostname(text)',
        'EXECUTE'
    ) then
        raise exception
            'Postflight I2A: service_role sem EXECUTE na RPC.';
    end if;

    -- A I2A NÃO pode abrir leitura direta das tabelas-base.

    if has_table_privilege(
        'anon',
        'public.tenants',
        'SELECT'
    ) then
        raise exception
            'Postflight I2A: anon recebeu SELECT direto em public.tenants.';
    end if;

    if has_table_privilege(
        'authenticated',
        'public.tenants',
        'SELECT'
    ) then
        raise exception
            'Postflight I2A: authenticated recebeu SELECT direto em public.tenants.';
    end if;

    if has_table_privilege(
        'anon',
        'public.tenant_domains',
        'SELECT'
    ) then
        raise exception
            'Postflight I2A: anon recebeu SELECT direto em public.tenant_domains.';
    end if;

    if has_table_privilege(
        'authenticated',
        'public.tenant_domains',
        'SELECT'
    ) then
        raise exception
            'Postflight I2A: authenticated recebeu SELECT direto em public.tenant_domains.';
    end if;
end;
$postflight$;

notify pgrst, 'reload schema';

commit;