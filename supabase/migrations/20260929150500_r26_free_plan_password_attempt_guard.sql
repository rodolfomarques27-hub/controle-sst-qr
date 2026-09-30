-- ============================================================
-- SafeScan Brasil
-- R2.6-A12 — Free Plan Password Attempt Guard
--
-- Adapta o motor já criado em
-- 20260928212000_r26_password_attempt_guard.sql
-- para uso exclusivo por Edge Function server-side.
--
-- Não expõe estado de segurança para anon/authenticated.
-- Não armazena senha, hash ou token CAPTCHA.
-- ============================================================

begin;

-- ============================================================
-- 1. RESOLVER USER_ID POR E-MAIL
--
-- Somente service_role pode executar.
-- A função existe para evitar listUsers/paginação e manter
-- a resolução inteiramente server-side.
-- ============================================================

create function
    public.password_auth_guard_resolver_usuario_email(
        p_email text
    )
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
    select
        usuario.id
    from
        auth.users as usuario
    where
        usuario.deleted_at is null
        and lower(
            btrim(
                coalesce(
                    usuario.email,
                    ''
                )
            )
        ) =
        lower(
            btrim(
                coalesce(
                    p_email,
                    ''
                )
            )
        )
        and btrim(
            coalesce(
                p_email,
                ''
            )
        ) <> ''
    order by
        usuario.created_at asc,
        usuario.id asc
    limit 1;
$function$;

comment on function
    public.password_auth_guard_resolver_usuario_email(text)
is
    'Resolve user_id por e-mail exclusivamente para o login guard server-side. Não é acessível por anon/authenticated.';

alter function
    public.password_auth_guard_resolver_usuario_email(text)
owner to postgres;

revoke all
on function
    public.password_auth_guard_resolver_usuario_email(text)
from public;

revoke all
on function
    public.password_auth_guard_resolver_usuario_email(text)
from anon;

revoke all
on function
    public.password_auth_guard_resolver_usuario_email(text)
from authenticated;

revoke all
on function
    public.password_auth_guard_resolver_usuario_email(text)
from supabase_auth_admin;

revoke all
on function
    public.password_auth_guard_resolver_usuario_email(text)
from service_role;

grant execute
on function
    public.password_auth_guard_resolver_usuario_email(text)
to service_role;

-- ============================================================
-- 2. STATUS PRIVADO DO GUARD
--
-- Somente service_role.
-- Nenhum acesso direto à tabela é concedido ao service_role.
-- ============================================================

create function
    public.password_auth_guard_status(
        p_user_id uuid
    )
returns table (
    blocked_until timestamptz,
    blocks_today smallint,
    failure_count integer,
    last_failed_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
    select
        estado.blocked_until,
        estado.blocks_today,
        estado.failure_count,
        estado.last_failed_at
    from
        public.password_auth_attempt_state
            as estado
    where
        estado.user_id =
            p_user_id
    limit 1;
$function$;

comment on function
    public.password_auth_guard_status(uuid)
is
    'Consulta privada do estado de bloqueio usada exclusivamente pela Edge Function auth-login-guard.';

alter function
    public.password_auth_guard_status(uuid)
owner to postgres;

revoke all
on function
    public.password_auth_guard_status(uuid)
from public;

revoke all
on function
    public.password_auth_guard_status(uuid)
from anon;

revoke all
on function
    public.password_auth_guard_status(uuid)
from authenticated;

revoke all
on function
    public.password_auth_guard_status(uuid)
from supabase_auth_admin;

revoke all
on function
    public.password_auth_guard_status(uuid)
from service_role;

grant execute
on function
    public.password_auth_guard_status(uuid)
to service_role;

-- ============================================================
-- 3. PERMITIR AO LOGIN GUARD EXECUTAR O MOTOR ATÔMICO
--
-- A tabela continua sem DML direto para service_role.
-- A escrita ocorre somente dentro da função SECURITY DEFINER
-- já homologada no R2.6-A1.
-- ============================================================

revoke all
on function
    public.hook_password_verification_attempt(jsonb)
from service_role;

grant execute
on function
    public.hook_password_verification_attempt(jsonb)
to service_role;

-- Reafirma explicitamente a ausência de acesso cliente.

revoke all
on table
    public.password_auth_attempt_state
from anon;

revoke all
on table
    public.password_auth_attempt_state
from authenticated;

commit;
