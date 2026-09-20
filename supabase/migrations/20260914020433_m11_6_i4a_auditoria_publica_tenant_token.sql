-- SafeScan Brasil
-- M11.6-I4A
--
-- Hardening da RPC publica de listagem de empresas da Auditoria de Campo.
--
-- Problema confirmado:
--   listar_empresas_auditoria_publica(text, text) existe no banco vivo,
--   mas nao estava versionada em migration local e, apos validar token/senha,
--   retornava empresas de todos os tenants.
--
-- Estrategia:
--   token/senha
--       -> validar_acesso_auditoria_publica()
--       -> token_id persistido
--       -> auditoria_tokens_publicos.empresa_id
--       -> empresas.tenant_id
--       -> somente empresas pertencentes ao mesmo tenant
--
-- Compatibilidade:
--   - preserva a assinatura da RPC;
--   - preserva todas as colunas retornadas;
--   - preserva filtros de nome/status;
--   - nao exige tenant status = ativo nesta fase;
--   - nao altera frontend;
--   - nao altera dados;
--   - nao altera Edge Functions;
--   - nao altera RLS.
--
-- Segurança:
--   - SECURITY DEFINER;
--   - search_path pg_catalog, public;
--   - remove EXECUTE generico de PUBLIC;
--   - mantem apenas anon, authenticated e service_role explicitamente.

begin;

-- =============================================================
-- PREFLIGHT
-- =============================================================

do $preflight$
declare
    v_funcao_oid oid;
    v_invalidos bigint;
begin
    v_funcao_oid :=
        to_regprocedure(
            'public.listar_empresas_auditoria_publica(text,text)'
        );

    if v_funcao_oid is null then
        raise exception
            'M11.6-I4A: listar_empresas_auditoria_publica(text,text) ausente no banco vivo.';
    end if;

    if to_regprocedure(
        'public.validar_acesso_auditoria_publica(text,text)'
    ) is null then
        raise exception
            'M11.6-I4A: validar_acesso_auditoria_publica(text,text) ausente.';
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'auditoria_tokens_publicos'
          and column_name = 'empresa_id'
          and data_type = 'uuid'
    ) then
        raise exception
            'M11.6-I4A: auditoria_tokens_publicos.empresa_id uuid ausente.';
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'empresas'
          and column_name = 'tenant_id'
          and data_type = 'uuid'
    ) then
        raise exception
            'M11.6-I4A: empresas.tenant_id uuid ausente.';
    end if;

    if not (
        select p.prosecdef
        from pg_proc p
        where p.oid = v_funcao_oid
    ) then
        raise exception
            'M11.6-I4A: RPC atual deveria ser SECURITY DEFINER.';
    end if;

    -- Nenhum token ativo pode ficar sem uma empresa/tenant resolvivel.
    select count(*)
    into v_invalidos
    from public.auditoria_tokens_publicos token_registro
    left join public.empresas empresa
      on empresa.id = token_registro.empresa_id
    where token_registro.ativo is true
      and (
          token_registro.empresa_id is null
          or empresa.id is null
          or empresa.tenant_id is null
      );

    if v_invalidos <> 0 then
        raise exception
            'M11.6-I4A: existem % tokens ativos sem empresa/tenant valido.',
            v_invalidos;
    end if;
end;
$preflight$;

-- =============================================================
-- RPC TENANT-AWARE
-- =============================================================

create or replace function
    public.listar_empresas_auditoria_publica(
        p_token text,
        p_senha text
    )
returns table (
    id uuid,
    nome text,
    status text,
    tipo_empresa text,
    responsavel_auditoria text,
    responsavel text,
    email_auditoria text,
    email text,
    whatsapp_auditoria text,
    telefone text,
    tst_responsavel text,
    tst_email text,
    tst_whatsapp text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_validacao jsonb;
    v_autorizado boolean := false;

    v_token_id uuid;
    v_empresa_token_id uuid;
    v_tenant_id uuid;
begin
    -- A senha/token continuam sendo validados pela fonte server-side
    -- já existente e utilizada pelo sistema.
    v_validacao :=
        public.validar_acesso_auditoria_publica(
            p_token,
            p_senha
        );

    v_autorizado :=
        coalesce(
            (v_validacao ->> 'autorizado')::boolean,
            (v_validacao ->> 'ok')::boolean,
            false
        );

    if not v_autorizado then
        raise exception using
            errcode = '42501',
            message =
                'Acesso publico da auditoria nao autorizado. Verifique token e senha.';
    end if;

    v_token_id :=
        nullif(
            btrim(
                coalesce(
                    v_validacao ->> 'token_id',
                    ''
                )
            ),
            ''
        )::uuid;

    if v_token_id is null then
        raise exception using
            errcode = '42501',
            message =
                'Token publico validado sem identificador persistido.';
    end if;

    -- A empresa/tenant nunca são aceitos do navegador.
    -- A fronteira e derivada exclusivamente do token persistido.
    select
        token_registro.empresa_id,
        empresa_token.tenant_id
    into
        v_empresa_token_id,
        v_tenant_id
    from public.auditoria_tokens_publicos token_registro
    inner join public.empresas empresa_token
      on empresa_token.id = token_registro.empresa_id
    where token_registro.id = v_token_id
      and btrim(
          coalesce(
              token_registro.token,
              ''
          )
      ) =
          btrim(
              coalesce(
                  p_token,
                  ''
              )
          )
      and token_registro.ativo is true
      and (
          token_registro.data_expiracao is null
          or token_registro.data_expiracao > now()
      )
    limit 1;

    if not found
       or v_empresa_token_id is null
       or v_tenant_id is null
    then
        raise exception using
            errcode = '42501',
            message =
                'Token publico sem empresa ou tenant valido para a auditoria.';
    end if;

    return query
    select
        empresa.id,
        empresa.nome::text,
        empresa.status::text,
        empresa.tipo_empresa::text,
        empresa.responsavel_auditoria::text,
        empresa.responsavel::text,
        empresa.email_auditoria::text,
        empresa.email::text,
        empresa.whatsapp_auditoria::text,
        empresa.telefone::text,
        empresa.tst_responsavel::text,
        empresa.tst_email::text,
        empresa.tst_whatsapp::text
    from public.empresas empresa
    where empresa.tenant_id = v_tenant_id
      and coalesce(
          empresa.nome,
          ''
      ) <> ''
      and (
          empresa.status is null
          or lower(
              empresa.status
          ) not like '%inativa%'
      )
    order by empresa.nome;
end;
$function$;

comment on function
    public.listar_empresas_auditoria_publica(text, text)
is
    'M11.6-I4A: lista empresas publicas somente do tenant derivado do token persistido da auditoria.';

-- =============================================================
-- EXECUTE ACL
-- =============================================================

revoke all
on function
    public.listar_empresas_auditoria_publica(text, text)
from public;

revoke all
on function
    public.listar_empresas_auditoria_publica(text, text)
from anon;

revoke all
on function
    public.listar_empresas_auditoria_publica(text, text)
from authenticated;

revoke all
on function
    public.listar_empresas_auditoria_publica(text, text)
from service_role;

grant execute
on function
    public.listar_empresas_auditoria_publica(text, text)
to anon, authenticated, service_role;

-- =============================================================
-- POSTFLIGHT
-- =============================================================

do $postflight$
declare
    v_funcao_oid oid;
    v_definicao text;
    v_public_execute boolean;
    v_invalidos bigint;
begin
    v_funcao_oid :=
        to_regprocedure(
            'public.listar_empresas_auditoria_publica(text,text)'
        );

    if v_funcao_oid is null then
        raise exception
            'M11.6-I4A: RPC nao localizada no pos-check.';
    end if;

    if not (
        select p.prosecdef
        from pg_proc p
        where p.oid = v_funcao_oid
    ) then
        raise exception
            'M11.6-I4A: RPC perdeu SECURITY DEFINER.';
    end if;

    if not (
        select
            coalesce(
                p.proconfig,
                array[]::text[]
            )
            @>
            array[
                'search_path=pg_catalog, public'
            ]::text[]
        from pg_proc p
        where p.oid = v_funcao_oid
    ) then
        raise exception
            'M11.6-I4A: search_path da RPC divergente.';
    end if;

    v_definicao :=
        pg_get_functiondef(
            v_funcao_oid
        );

    if position(
        'token_registro.empresa_id'
        in v_definicao
    ) = 0 then
        raise exception
            'M11.6-I4A: RPC nao deriva empresa do token persistido.';
    end if;

    if position(
        'empresa_token.tenant_id'
        in v_definicao
    ) = 0 then
        raise exception
            'M11.6-I4A: RPC nao deriva tenant da empresa do token.';
    end if;

    if position(
        'empresa.tenant_id = v_tenant_id'
        in v_definicao
    ) = 0 then
        raise exception
            'M11.6-I4A: filtro tenant-aware nao localizado.';
    end if;

    -- PUBLIC nao pode manter EXECUTE herdado/default.
    select exists (
        select 1
        from pg_proc p
        cross join lateral
            aclexplode(
                coalesce(
                    p.proacl,
                    acldefault(
                        'f',
                        p.proowner
                    )
                )
            ) acl
        where p.oid = v_funcao_oid
          and acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
    )
    into v_public_execute;

    if v_public_execute then
        raise exception
            'M11.6-I4A: PUBLIC ainda possui EXECUTE na RPC.';
    end if;

    if not has_function_privilege(
        'anon',
        'public.listar_empresas_auditoria_publica(text,text)',
        'EXECUTE'
    ) then
        raise exception
            'M11.6-I4A: anon deveria possuir EXECUTE.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.listar_empresas_auditoria_publica(text,text)',
        'EXECUTE'
    ) then
        raise exception
            'M11.6-I4A: authenticated deveria possuir EXECUTE.';
    end if;

    if not has_function_privilege(
        'service_role',
        'public.listar_empresas_auditoria_publica(text,text)',
        'EXECUTE'
    ) then
        raise exception
            'M11.6-I4A: service_role deveria possuir EXECUTE.';
    end if;

    select count(*)
    into v_invalidos
    from public.auditoria_tokens_publicos token_registro
    left join public.empresas empresa
      on empresa.id = token_registro.empresa_id
    where token_registro.ativo is true
      and (
          token_registro.empresa_id is null
          or empresa.id is null
          or empresa.tenant_id is null
      );

    if v_invalidos <> 0 then
        raise exception
            'M11.6-I4A: token ativo invalido localizado no pos-check.';
    end if;
end;
$postflight$;

commit;
