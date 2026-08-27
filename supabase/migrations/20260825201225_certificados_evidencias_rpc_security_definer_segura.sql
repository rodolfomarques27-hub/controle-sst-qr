begin;

-- ============================================================
-- E3-EVID-RLS-RPC-SECURE-R1
--
-- Objetivo:
-- - preservar integralmente as implementações LIMIT-2 atuais;
-- - preservar SHA-256 e histórico;
-- - manter policies diretas restritas;
-- - permitir arquivamento controlado somente pelas RPCs;
-- - manter a API pública com nomes, argumentos e defaults atuais;
-- - impedir acesso direto aos cores privilegiados.
--
-- Nenhuma alteração de Storage.
-- Nenhuma alteração de policy.
-- Nenhuma alteração de dados deve ocorrer durante esta migration.
-- ============================================================

do $preflight$
declare
    v_rpc oid;
    v_rpc_sha oid;
    v_helper_ativo oid;
    v_helper_acesso oid;
    v_rls boolean;
    v_force_rls boolean;
    v_policy_count integer;
begin
    if
        pg_catalog.to_regnamespace(
            'safescan_private'
        ) is not null
    then
        raise exception
            'E3-SECURE: schema safescan_private já existe. Abortando one-shot.';
    end if;

    v_rpc :=
        pg_catalog.to_regprocedure(
            'public.registrar_certificado_evidencia_corrente(uuid,uuid,integer,text,text,uuid,text,text,date,date,text,text,text,boolean)'
        );

    v_rpc_sha :=
        pg_catalog.to_regprocedure(
            'public.registrar_certificado_evidencia_corrente_sha256(uuid,uuid,integer,text,text,text,uuid,text,text,date,date,text,text,text,boolean)'
        );

    if v_rpc is null then
        raise exception
            'E3-SECURE: RPC corrente não localizada.';
    end if;

    if v_rpc_sha is null then
        raise exception
            'E3-SECURE: RPC SHA-256 não localizada.';
    end if;

    if (
        select p.prosecdef
        from pg_catalog.pg_proc p
        where p.oid = v_rpc
    )
    then
        raise exception
            'E3-SECURE: RPC corrente já é SECURITY DEFINER.';
    end if;

    if (
        select p.prosecdef
        from pg_catalog.pg_proc p
        where p.oid = v_rpc_sha
    )
    then
        raise exception
            'E3-SECURE: RPC SHA-256 já é SECURITY DEFINER.';
    end if;

    if (
        select pg_catalog.pg_get_userbyid(
            p.proowner
        )
        from pg_catalog.pg_proc p
        where p.oid = v_rpc
    ) <> 'postgres'
    then
        raise exception
            'E3-SECURE: owner inesperado na RPC corrente.';
    end if;

    if (
        select pg_catalog.pg_get_userbyid(
            p.proowner
        )
        from pg_catalog.pg_proc p
        where p.oid = v_rpc_sha
    ) <> 'postgres'
    then
        raise exception
            'E3-SECURE: owner inesperado na RPC SHA-256.';
    end if;

    if not exists (
        select
            1
        from
            pg_catalog.pg_roles r
        where
            r.rolname = 'postgres'
            and
            r.rolbypassrls is true
    )
    then
        raise exception
            'E3-SECURE: postgres não possui BYPASSRLS.';
    end if;

    v_helper_ativo :=
        pg_catalog.to_regprocedure(
            'public.usuario_ativo_sistema()'
        );

    v_helper_acesso :=
        pg_catalog.to_regprocedure(
            'public.usuario_tem_acesso_certificado(uuid)'
        );

    if v_helper_ativo is null then
        raise exception
            'E3-SECURE: helper usuario_ativo_sistema ausente.';
    end if;

    if v_helper_acesso is null then
        raise exception
            'E3-SECURE: helper usuario_tem_acesso_certificado ausente.';
    end if;

    if not (
        select p.prosecdef
        from pg_catalog.pg_proc p
        where p.oid = v_helper_ativo
    )
    then
        raise exception
            'E3-SECURE: helper usuario_ativo_sistema deixou de ser DEFINER.';
    end if;

    if not (
        select p.prosecdef
        from pg_catalog.pg_proc p
        where p.oid = v_helper_acesso
    )
    then
        raise exception
            'E3-SECURE: helper usuario_tem_acesso_certificado deixou de ser DEFINER.';
    end if;

    if (
        select pg_catalog.pg_get_userbyid(
            p.proowner
        )
        from pg_catalog.pg_proc p
        where p.oid = v_helper_ativo
    ) <> 'postgres'
    then
        raise exception
            'E3-SECURE: owner inesperado no helper de usuário ativo.';
    end if;

    if (
        select pg_catalog.pg_get_userbyid(
            p.proowner
        )
        from pg_catalog.pg_proc p
        where p.oid = v_helper_acesso
    ) <> 'postgres'
    then
        raise exception
            'E3-SECURE: owner inesperado no helper de acesso.';
    end if;

    select
        c.relrowsecurity,
        c.relforcerowsecurity
    into
        v_rls,
        v_force_rls
    from
        pg_catalog.pg_class c
    inner join
        pg_catalog.pg_namespace n
        on n.oid = c.relnamespace
    where
        n.nspname = 'public'
        and
        c.relname = 'certificados_evidencias';

    if v_rls is distinct from true then
        raise exception
            'E3-SECURE: RLS não está habilitado.';
    end if;

    if v_force_rls is distinct from false then
        raise exception
            'E3-SECURE: FORCE RLS divergiu do estado auditado.';
    end if;

    select
        count(*)
    into
        v_policy_count
    from
        pg_catalog.pg_policies
    where
        schemaname = 'public'
        and
        tablename = 'certificados_evidencias';

    if v_policy_count <> 4 then
        raise exception
            'E3-SECURE: quantidade inesperada de policies: %.',
            v_policy_count;
    end if;

    if not exists (
        select
            1
        from
            pg_catalog.pg_policies
        where
            schemaname = 'public'
            and
            tablename = 'certificados_evidencias'
            and
            cmd = 'UPDATE'
            and
            position(
                'HISTORICA IS FALSE'
                in upper(
                    coalesce(
                        qual,
                        ''
                    )
                )
            ) > 0
            and
            position(
                'HISTORICA IS FALSE'
                in upper(
                    coalesce(
                        with_check,
                        ''
                    )
                )
            ) > 0
    )
    then
        raise exception
            'E3-SECURE: policy UPDATE deixou de proteger historica=false.';
    end if;

    if not pg_catalog.has_function_privilege(
        'authenticated',
        v_rpc,
        'EXECUTE'
    )
    then
        raise exception
            'E3-SECURE: authenticated sem EXECUTE na RPC corrente.';
    end if;

    if not pg_catalog.has_function_privilege(
        'authenticated',
        v_rpc_sha,
        'EXECUTE'
    )
    then
        raise exception
            'E3-SECURE: authenticated sem EXECUTE na RPC SHA.';
    end if;

    if not pg_catalog.has_function_privilege(
        'service_role',
        v_rpc,
        'EXECUTE'
    )
    then
        raise exception
            'E3-SECURE: service_role sem EXECUTE na RPC corrente.';
    end if;

    if not pg_catalog.has_function_privilege(
        'service_role',
        v_rpc_sha,
        'EXECUTE'
    )
    then
        raise exception
            'E3-SECURE: service_role sem EXECUTE na RPC SHA.';
    end if;

    if pg_catalog.has_function_privilege(
        'anon',
        v_rpc,
        'EXECUTE'
    )
    then
        raise exception
            'E3-SECURE: anon possui EXECUTE inesperado na RPC corrente.';
    end if;

    if pg_catalog.has_function_privilege(
        'anon',
        v_rpc_sha,
        'EXECUTE'
    )
    then
        raise exception
            'E3-SECURE: anon possui EXECUTE inesperado na RPC SHA.';
    end if;
end;
$preflight$;

create temporary table
e3_secure_function_snapshot
on commit drop
as
select
    p.oid as function_oid,
    p.prosrc,
    p.proargnames,
    p.pronargdefaults,
    p.proargdefaults::text as proargdefaults_text,
    p.prorettype,
    p.prolang,
    p.provolatile,
    p.proparallel
from
    pg_catalog.pg_proc p
where
    p.oid in (
        pg_catalog.to_regprocedure(
            'public.registrar_certificado_evidencia_corrente(uuid,uuid,integer,text,text,uuid,text,text,date,date,text,text,text,boolean)'
        ),
        pg_catalog.to_regprocedure(
            'public.registrar_certificado_evidencia_corrente_sha256(uuid,uuid,integer,text,text,text,uuid,text,text,date,date,text,text,text,boolean)'
        )
    );

create temporary table
e3_secure_policy_snapshot
on commit drop
as
select
    policyname,
    permissive,
    roles::text as roles_text,
    cmd,
    qual,
    with_check
from
    pg_catalog.pg_policies
where
    schemaname = 'public'
    and
    tablename = 'certificados_evidencias';

create temporary table
e3_secure_rls_snapshot
on commit drop
as
select
    c.relrowsecurity,
    c.relforcerowsecurity
from
    pg_catalog.pg_class c
inner join
    pg_catalog.pg_namespace n
    on n.oid = c.relnamespace
where
    n.nspname = 'public'
    and
    c.relname = 'certificados_evidencias';

create temporary table
e3_secure_data_snapshot
on commit drop
as
select
    count(*)::bigint as total,
    count(*) filter (
        where historica is false
    )::bigint as correntes,
    count(*) filter (
        where historica is true
    )::bigint as historicas,
    count(*) filter (
        where historica is null
    )::bigint as historica_null
from
    public.certificados_evidencias;

create schema
safescan_private
authorization postgres;

revoke all
on schema safescan_private
from public, anon, authenticated, service_role;

alter function
public.registrar_certificado_evidencia_corrente(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
set schema safescan_private;

alter function
safescan_private.registrar_certificado_evidencia_corrente(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
rename to
registrar_certificado_evidencia_corrente_core;

alter function
safescan_private.registrar_certificado_evidencia_corrente_core(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
security invoker;

alter function
safescan_private.registrar_certificado_evidencia_corrente_core(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
set search_path = '';

alter function
safescan_private.registrar_certificado_evidencia_corrente_core(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
owner to postgres;

revoke all
on function
safescan_private.registrar_certificado_evidencia_corrente_core(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
from public, anon, authenticated, service_role;

alter function
public.registrar_certificado_evidencia_corrente_sha256(
    uuid,
    uuid,
    integer,
    text,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
set schema safescan_private;

alter function
safescan_private.registrar_certificado_evidencia_corrente_sha256(
    uuid,
    uuid,
    integer,
    text,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
rename to
registrar_certificado_evidencia_corrente_sha256_core;

alter function
safescan_private.registrar_certificado_evidencia_corrente_sha256_core(
    uuid,
    uuid,
    integer,
    text,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
security invoker;

alter function
safescan_private.registrar_certificado_evidencia_corrente_sha256_core(
    uuid,
    uuid,
    integer,
    text,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
set search_path = '';

alter function
safescan_private.registrar_certificado_evidencia_corrente_sha256_core(
    uuid,
    uuid,
    integer,
    text,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
owner to postgres;

revoke all
on function
safescan_private.registrar_certificado_evidencia_corrente_sha256_core(
    uuid,
    uuid,
    integer,
    text,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
from public, anon, authenticated, service_role;

create function
public.registrar_certificado_evidencia_corrente(
    p_certificado_origem_id uuid,
    p_colaborador_id uuid,
    p_treinamento_codigo integer,
    p_tipo_evidencia text,
    p_arquivo_url text,
    p_treinamento_id uuid default null::uuid,
    p_tipo_treinamento text default null::text,
    p_nome_treinamento text default null::text,
    p_data_realizacao date default null::date,
    p_data_vencimento date default null::date,
    p_arquivo_nome text default null::text,
    p_observacao text default null::text,
    p_status_validacao text default 'Pendente de verificação'::text,
    p_principal boolean default false
)
returns public.certificados_evidencias
language plpgsql
security definer
set search_path = ''
as $rpc_secure$
declare
    v_service_role boolean :=
        coalesce(
            auth.jwt() ->> 'role',
            ''
        ) = 'service_role';
begin
    if p_colaborador_id is null then
        raise exception
            'E3-SECURE: colaborador_id obrigatório.'
            using errcode = '22004';
    end if;

    if not v_service_role then
        if auth.uid() is null then
            raise exception
                'E3-SECURE: autenticação obrigatória.'
                using errcode = '42501';
        end if;

        if not coalesce(
            public.usuario_ativo_sistema(),
            false
        )
        then
            raise exception
                'E3-SECURE: usuário inativo ou bloqueado.'
                using errcode = '42501';
        end if;

        if not coalesce(
            public.usuario_tem_acesso_certificado(
                p_colaborador_id
            ),
            false
        )
        then
            raise exception
                'E3-SECURE: usuário sem acesso ao colaborador.'
                using errcode = '42501';
        end if;
    end if;

    return
        safescan_private.registrar_certificado_evidencia_corrente_core(
            p_certificado_origem_id,
            p_colaborador_id,
            p_treinamento_codigo,
            p_tipo_evidencia,
            p_arquivo_url,
            p_treinamento_id,
            p_tipo_treinamento,
            p_nome_treinamento,
            p_data_realizacao,
            p_data_vencimento,
            p_arquivo_nome,
            p_observacao,
            p_status_validacao,
            p_principal
        );
end;
$rpc_secure$;

alter function
public.registrar_certificado_evidencia_corrente(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
owner to postgres;

revoke all
on function
public.registrar_certificado_evidencia_corrente(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
from public, anon, authenticated, service_role;

grant execute
on function
public.registrar_certificado_evidencia_corrente(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
to authenticated, service_role;

create function
public.registrar_certificado_evidencia_corrente_sha256(
    p_certificado_origem_id uuid,
    p_colaborador_id uuid,
    p_treinamento_codigo integer,
    p_tipo_evidencia text,
    p_arquivo_url text,
    p_arquivo_sha256 text,
    p_treinamento_id uuid default null::uuid,
    p_tipo_treinamento text default null::text,
    p_nome_treinamento text default null::text,
    p_data_realizacao date default null::date,
    p_data_vencimento date default null::date,
    p_arquivo_nome text default null::text,
    p_observacao text default null::text,
    p_status_validacao text default 'Pendente de verificação'::text,
    p_principal boolean default false
)
returns public.certificados_evidencias
language plpgsql
security definer
set search_path = ''
as $rpc_sha_secure$
declare
    v_service_role boolean :=
        coalesce(
            auth.jwt() ->> 'role',
            ''
        ) = 'service_role';
begin
    if p_colaborador_id is null then
        raise exception
            'E3-SECURE-SHA: colaborador_id obrigatório.'
            using errcode = '22004';
    end if;

    if not v_service_role then
        if auth.uid() is null then
            raise exception
                'E3-SECURE-SHA: autenticação obrigatória.'
                using errcode = '42501';
        end if;

        if not coalesce(
            public.usuario_ativo_sistema(),
            false
        )
        then
            raise exception
                'E3-SECURE-SHA: usuário inativo ou bloqueado.'
                using errcode = '42501';
        end if;

        if not coalesce(
            public.usuario_tem_acesso_certificado(
                p_colaborador_id
            ),
            false
        )
        then
            raise exception
                'E3-SECURE-SHA: usuário sem acesso ao colaborador.'
                using errcode = '42501';
        end if;
    end if;

    return
        safescan_private.registrar_certificado_evidencia_corrente_sha256_core(
            p_certificado_origem_id,
            p_colaborador_id,
            p_treinamento_codigo,
            p_tipo_evidencia,
            p_arquivo_url,
            p_arquivo_sha256,
            p_treinamento_id,
            p_tipo_treinamento,
            p_nome_treinamento,
            p_data_realizacao,
            p_data_vencimento,
            p_arquivo_nome,
            p_observacao,
            p_status_validacao,
            p_principal
        );
end;
$rpc_sha_secure$;

alter function
public.registrar_certificado_evidencia_corrente_sha256(
    uuid,
    uuid,
    integer,
    text,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
owner to postgres;

revoke all
on function
public.registrar_certificado_evidencia_corrente_sha256(
    uuid,
    uuid,
    integer,
    text,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
from public, anon, authenticated, service_role;

grant execute
on function
public.registrar_certificado_evidencia_corrente_sha256(
    uuid,
    uuid,
    integer,
    text,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
to authenticated, service_role;

do $postflight$
declare
    v_public oid;
    v_public_sha oid;
    v_core oid;
    v_core_sha oid;
    v_rls boolean;
    v_force_rls boolean;
    v_total bigint;
    v_correntes bigint;
    v_historicas bigint;
    v_historica_null bigint;
    v_total_before bigint;
    v_correntes_before bigint;
    v_historicas_before bigint;
    v_historica_null_before bigint;
begin
    v_public :=
        pg_catalog.to_regprocedure(
            'public.registrar_certificado_evidencia_corrente(uuid,uuid,integer,text,text,uuid,text,text,date,date,text,text,text,boolean)'
        );
    v_public_sha :=
        pg_catalog.to_regprocedure(
            'public.registrar_certificado_evidencia_corrente_sha256(uuid,uuid,integer,text,text,text,uuid,text,text,date,date,text,text,text,boolean)'
        );
    v_core :=
        pg_catalog.to_regprocedure(
            'safescan_private.registrar_certificado_evidencia_corrente_core(uuid,uuid,integer,text,text,uuid,text,text,date,date,text,text,text,boolean)'
        );
    v_core_sha :=
        pg_catalog.to_regprocedure(
            'safescan_private.registrar_certificado_evidencia_corrente_sha256_core(uuid,uuid,integer,text,text,text,uuid,text,text,date,date,text,text,text,boolean)'
        );

    if v_public is null or v_public_sha is null or v_core is null or v_core_sha is null then
        raise exception 'E3-SECURE: topologia final de funções incompleta.';
    end if;

    if exists (
        select 1
        from pg_temp.e3_secure_function_snapshot s
        left join pg_catalog.pg_proc p on p.oid = s.function_oid
        where p.oid is null
           or p.prosrc is distinct from s.prosrc
           or p.proargnames is distinct from s.proargnames
           or p.pronargdefaults is distinct from s.pronargdefaults
           or p.proargdefaults::text is distinct from s.proargdefaults_text
           or p.prorettype is distinct from s.prorettype
           or p.prolang is distinct from s.prolang
           or p.provolatile is distinct from s.provolatile
           or p.proparallel is distinct from s.proparallel
    ) then
        raise exception 'E3-SECURE: implementação core divergiu da implementação original.';
    end if;

    if not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = v_public) then
        raise exception 'E3-SECURE: RPC pública normal não é SECURITY DEFINER.';
    end if;
    if not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = v_public_sha) then
        raise exception 'E3-SECURE: RPC pública SHA não é SECURITY DEFINER.';
    end if;
    if (select p.prosecdef from pg_catalog.pg_proc p where p.oid = v_core) then
        raise exception 'E3-SECURE: core normal não deveria ser DEFINER.';
    end if;
    if (select p.prosecdef from pg_catalog.pg_proc p where p.oid = v_core_sha) then
        raise exception 'E3-SECURE: core SHA não deveria ser DEFINER.';
    end if;

    if exists (
        select 1
        from pg_catalog.pg_proc p
        where p.oid in (v_public, v_public_sha, v_core, v_core_sha)
          and (
            p.proconfig is null
            or array_to_string(p.proconfig, ',') ilike '%public%'
            or array_to_string(p.proconfig, ',') ilike '%pg_temp%'
          )
    ) then
        raise exception 'E3-SECURE: search_path inseguro ou ausente.';
    end if;

    if exists (
        select 1
        from pg_catalog.pg_proc p
        where p.oid in (v_public, v_public_sha, v_core, v_core_sha)
          and pg_catalog.pg_get_userbyid(p.proowner) <> 'postgres'
    ) then
        raise exception 'E3-SECURE: owner inesperado na topologia final.';
    end if;

    if not pg_catalog.has_function_privilege('authenticated', v_public, 'EXECUTE') then
        raise exception 'E3-SECURE: authenticated sem RPC pública normal.';
    end if;
    if not pg_catalog.has_function_privilege('authenticated', v_public_sha, 'EXECUTE') then
        raise exception 'E3-SECURE: authenticated sem RPC pública SHA.';
    end if;
    if not pg_catalog.has_function_privilege('service_role', v_public, 'EXECUTE') then
        raise exception 'E3-SECURE: service_role sem RPC pública normal.';
    end if;
    if not pg_catalog.has_function_privilege('service_role', v_public_sha, 'EXECUTE') then
        raise exception 'E3-SECURE: service_role sem RPC pública SHA.';
    end if;
    if pg_catalog.has_function_privilege('anon', v_public, 'EXECUTE') then
        raise exception 'E3-SECURE: anon possui RPC pública normal.';
    end if;
    if pg_catalog.has_function_privilege('anon', v_public_sha, 'EXECUTE') then
        raise exception 'E3-SECURE: anon possui RPC pública SHA.';
    end if;

    if pg_catalog.has_schema_privilege('anon', 'safescan_private', 'USAGE') then
        raise exception 'E3-SECURE: anon recebeu USAGE no schema privado.';
    end if;
    if pg_catalog.has_schema_privilege('authenticated', 'safescan_private', 'USAGE') then
        raise exception 'E3-SECURE: authenticated recebeu USAGE no schema privado.';
    end if;
    if pg_catalog.has_schema_privilege('service_role', 'safescan_private', 'USAGE') then
        raise exception 'E3-SECURE: service_role recebeu USAGE no schema privado.';
    end if;

    if pg_catalog.has_function_privilege('anon', v_core, 'EXECUTE')
       or pg_catalog.has_function_privilege('anon', v_core_sha, 'EXECUTE') then
        raise exception 'E3-SECURE: anon possui acesso direto a core.';
    end if;
    if pg_catalog.has_function_privilege('authenticated', v_core, 'EXECUTE')
       or pg_catalog.has_function_privilege('authenticated', v_core_sha, 'EXECUTE') then
        raise exception 'E3-SECURE: authenticated possui acesso direto a core.';
    end if;
    if pg_catalog.has_function_privilege('service_role', v_core, 'EXECUTE')
       or pg_catalog.has_function_privilege('service_role', v_core_sha, 'EXECUTE') then
        raise exception 'E3-SECURE: service_role possui acesso direto a core.';
    end if;

    if not exists (
        select 1 from pg_catalog.pg_proc p
        where p.oid = v_public
          and position('usuario_ativo_sistema' in p.prosrc) > 0
          and position('usuario_tem_acesso_certificado' in p.prosrc) > 0
          and position('registrar_certificado_evidencia_corrente_core' in p.prosrc) > 0
    ) then
        raise exception 'E3-SECURE: gate explícito ausente na RPC normal.';
    end if;

    if not exists (
        select 1 from pg_catalog.pg_proc p
        where p.oid = v_public_sha
          and position('usuario_ativo_sistema' in p.prosrc) > 0
          and position('usuario_tem_acesso_certificado' in p.prosrc) > 0
          and position('registrar_certificado_evidencia_corrente_sha256_core' in p.prosrc) > 0
    ) then
        raise exception 'E3-SECURE: gate explícito ausente na RPC SHA.';
    end if;

    select c.relrowsecurity, c.relforcerowsecurity
    into v_rls, v_force_rls
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname='certificados_evidencias';

    if exists (
        select 1
        from pg_temp.e3_secure_rls_snapshot s
        where v_rls is distinct from s.relrowsecurity
           or v_force_rls is distinct from s.relforcerowsecurity
    ) then
        raise exception 'E3-SECURE: estado RLS foi alterado.';
    end if;

    if exists (
        select 1 from (
            select policyname, permissive, roles::text as roles_text, cmd, qual, with_check
            from pg_catalog.pg_policies
            where schemaname='public' and tablename='certificados_evidencias'
            except
            select policyname, permissive, roles_text, cmd, qual, with_check
            from pg_temp.e3_secure_policy_snapshot
        ) diff_current
    ) or exists (
        select 1 from (
            select policyname, permissive, roles_text, cmd, qual, with_check
            from pg_temp.e3_secure_policy_snapshot
            except
            select policyname, permissive, roles::text as roles_text, cmd, qual, with_check
            from pg_catalog.pg_policies
            where schemaname='public' and tablename='certificados_evidencias'
        ) diff_before
    ) then
        raise exception 'E3-SECURE: conjunto ou conteúdo de policies foi alterado.';
    end if;

    select total, correntes, historicas, historica_null
    into v_total_before, v_correntes_before, v_historicas_before, v_historica_null_before
    from pg_temp.e3_secure_data_snapshot;

    select
        count(*)::bigint,
        count(*) filter (where historica is false)::bigint,
        count(*) filter (where historica is true)::bigint,
        count(*) filter (where historica is null)::bigint
    into v_total, v_correntes, v_historicas, v_historica_null
    from public.certificados_evidencias;

    if v_total is distinct from v_total_before
       or v_correntes is distinct from v_correntes_before
       or v_historicas is distinct from v_historicas_before
       or v_historica_null is distinct from v_historica_null_before then
        raise exception 'E3-SECURE: dados de evidências foram alterados pela migration.';
    end if;
end;
$postflight$;

comment on schema safescan_private is
'Implementações internas privilegiadas do SafeScan. Sem acesso direto para papéis da Data API.';

comment on function
public.registrar_certificado_evidencia_corrente(
    uuid, uuid, integer, text, text, uuid, text, text, date, date, text, text, text, boolean
)
is
'RPC pública SafeScan para registro atômico de evidência corrente. SECURITY DEFINER com autorização explícita; implementação LIMIT-2 preservada em core privado.';

comment on function
public.registrar_certificado_evidencia_corrente_sha256(
    uuid, uuid, integer, text, text, text, uuid, text, text, date, date, text, text, text, boolean
)
is
'RPC pública SafeScan para registro atômico/idempotente por SHA-256. SECURITY DEFINER com autorização explícita; implementação LIMIT-2 preservada em core privado.';

notify pgrst, 'reload schema';

commit;