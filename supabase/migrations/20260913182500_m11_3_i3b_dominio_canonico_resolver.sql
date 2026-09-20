-- ============================================================================
-- SafeScan Brasil
-- M11.3 / I3-B1
-- Extensão backward-compatible do resolver de tenant por hostname.
--
-- Objetivo:
-- - preservar o hostname acessado como contexto de execução;
-- - preservar tenant e dominio já retornados pela I2A;
-- - acrescentar dominioCanonico do mesmo tenant;
-- - aceitar como canônico somente domínio:
--     principal = true
--     status = 'ativo'
--     verificado_em is not null
-- - não cadastrar tenant ou domínio;
-- - não alterar memberships, RLS ou autorização;
-- - hostname continua sendo contexto, nunca autorização.
-- ============================================================================

do $preflight$
begin
    if to_regclass('public.tenants') is null then
        raise exception
            'I3-B1: tabela public.tenants não localizada.';
    end if;

    if to_regclass('public.tenant_domains') is null then
        raise exception
            'I3-B1: tabela public.tenant_domains não localizada.';
    end if;

    if to_regprocedure(
        'public.resolver_contexto_tenant_por_hostname(text)'
    ) is null then
        raise exception
            'I3-B1: RPC resolver_contexto_tenant_por_hostname(text) não localizada.';
    end if;

    if not exists (
        select 1
        from pg_catalog.pg_indexes
        where schemaname = 'public'
          and tablename = 'tenant_domains'
          and indexname =
              'uq_tenant_domains_hostname'
    ) then
        raise exception
            'I3-B1: índice uq_tenant_domains_hostname não localizado.';
    end if;

    if not exists (
        select 1
        from pg_catalog.pg_indexes
        where schemaname = 'public'
          and tablename = 'tenant_domains'
          and indexname =
              'uq_tenant_domains_principal_ativo'
    ) then
        raise exception
            'I3-B1: índice uq_tenant_domains_principal_ativo não localizado.';
    end if;
end;
$preflight$;

create or replace function
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

    v_dominio_canonico_hostname text;
    v_dominio_canonico_tipo text;
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
                null,

            'dominioCanonico',
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
                null,

            'dominioCanonico',
                null
        );
    end if;

    select
        dc.hostname,
        dc.tipo
    into
        v_dominio_canonico_hostname,
        v_dominio_canonico_tipo
    from public.tenant_domains dc
    where dc.tenant_id = v_tenant_id
      and dc.principal = true
      and dc.status = 'ativo'
      and dc.verificado_em is not null;

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
            ),

        'dominioCanonico',
            case
                when v_dominio_canonico_hostname is null
                then null
                else jsonb_build_object(
                    'hostname',
                        v_dominio_canonico_hostname,

                    'tipo',
                        v_dominio_canonico_tipo,

                    'principal',
                        true
                )
            end
    );
end;
$function$;

comment on function
    public.resolver_contexto_tenant_por_hostname(text)
is
'Resolve contexto de tenant pelo hostname acessado e retorna, separadamente, o domínio principal ativo/verificado para origem pública canônica. Hostname não constitui autorização.';

do $postflight$
declare
    v_security_definer boolean;
    v_volatilidade "char";
    v_definicao text;
begin
    select
        p.prosecdef,
        p.provolatile,
        pg_catalog.pg_get_functiondef(
            p.oid
        )
    into
        v_security_definer,
        v_volatilidade,
        v_definicao
    from pg_catalog.pg_proc p
    inner join pg_catalog.pg_namespace n
        on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname =
          'resolver_contexto_tenant_por_hostname'
      and pg_catalog.pg_get_function_identity_arguments(
          p.oid
      ) = 'p_hostname text';

    if not found then
        raise exception
            'I3-B1 postflight: função não localizada.';
    end if;

    if not coalesce(
        v_security_definer,
        false
    ) then
        raise exception
            'I3-B1 postflight: função deixou de ser SECURITY DEFINER.';
    end if;

    if v_volatilidade <> 's' then
        raise exception
            'I3-B1 postflight: função deixou de ser STABLE.';
    end if;

    if position(
        '''dominioCanonico''' in
        v_definicao
    ) = 0 then
        raise exception
            'I3-B1 postflight: dominioCanonico não localizado no contrato da função.';
    end if;

    if position(
        'dc.principal = true' in
        v_definicao
    ) = 0 then
        raise exception
            'I3-B1 postflight: filtro de domínio principal não localizado.';
    end if;

    if position(
        'dc.status = ''ativo''' in
        v_definicao
    ) = 0 then
        raise exception
            'I3-B1 postflight: filtro de domínio ativo não localizado.';
    end if;

    if position(
        'dc.verificado_em is not null' in
        lower(
            v_definicao
        )
    ) = 0 then
        raise exception
            'I3-B1 postflight: exigência de domínio verificado não localizada.';
    end if;
end;
$postflight$;

-- CREATE OR REPLACE preserva o objeto existente e seus privilégios.
-- Nenhum GRANT/REVOKE novo é introduzido nesta microetapa.