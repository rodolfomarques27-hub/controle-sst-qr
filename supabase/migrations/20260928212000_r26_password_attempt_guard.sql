-- ============================================================
-- SafeScan Brasil
-- R2.6-A1 — Password Attempt Guard
--
-- Objetivo:
-- - limitar tentativas inválidas de autenticação por senha;
-- - executar integralmente dentro do Supabase Auth;
-- - não armazenar senha, hash ou conteúdo de credencial;
-- - manter o estado privado e inacessível ao cliente;
-- - NÃO ativa o Auth Hook hospedado nesta migration.
--
-- Regra:
-- - janela: 15 minutos;
-- - bloqueio após: 5 falhas;
-- - 1º bloqueio no dia: 15 minutos;
-- - 2º bloqueio no mesmo dia: 30 minutos;
-- - 3º e posteriores no mesmo dia: 60 minutos;
-- - bloqueio vigente rejeita inclusive senha válida;
-- - login válido após o bloqueio expirar limpa a janela
--   de falhas, preservando o nível diário de reincidência.
--
-- "Dia" para fins de escalonamento é UTC, de forma
-- determinística e independente do timezone da sessão.
-- ============================================================

begin;

-- ============================================================
-- 1. ESTADO PRIVADO DO PASSWORD VERIFICATION HOOK
-- ============================================================

create table
    public.password_auth_attempt_state (
        user_id uuid
            primary key
            references auth.users(id)
            on delete cascade,

        failure_count integer
            not null
            default 0,

        window_started_at timestamptz
            null,

        last_failed_at timestamptz
            null,

        blocked_until timestamptz
            null,

        block_day date
            null,

        blocks_today smallint
            not null
            default 0,

        last_blocked_at timestamptz
            null,

        updated_at timestamptz
            not null
            default now(),

        constraint
            password_auth_attempt_state_failure_count_check
            check (
                failure_count >= 0
            ),

        constraint
            password_auth_attempt_state_blocks_today_check
            check (
                blocks_today >= 0
                and blocks_today <= 3
            )
    );

comment on table
    public.password_auth_attempt_state
is
    'Estado privado server-side do Password Verification Hook. Não armazena senha, hash ou conteúdo de credencial.';

alter table
    public.password_auth_attempt_state
enable row level security;

-- ============================================================
-- 2. PRIVILÉGIOS DA TABELA
--
-- Nenhum papel utilizado pela aplicação tem acesso direto.
-- O único consumidor funcional é o Supabase Auth.
-- ============================================================

revoke all
on table
    public.password_auth_attempt_state
from public;

revoke all
on table
    public.password_auth_attempt_state
from anon;

revoke all
on table
    public.password_auth_attempt_state
from authenticated;

revoke all
on table
    public.password_auth_attempt_state
from service_role;

grant
    select,
    insert,
    update,
    delete
on table
    public.password_auth_attempt_state
to supabase_auth_admin;

create policy
    "password_auth_attempt_state_auth_admin"
on
    public.password_auth_attempt_state
for all
to supabase_auth_admin
using (
    true
)
with check (
    true
);

-- ============================================================
-- 3. PASSWORD VERIFICATION HOOK
--
-- Entrada oficial esperada pelo Supabase Auth:
--
-- {
--   "user_id": "<uuid>",
--   "valid": true | false
-- }
--
-- O hook não recebe nem lê a senha digitada.
-- ============================================================

create function
    public.hook_password_verification_attempt(
        event jsonb
    )
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_now timestamptz :=
        now();

    v_security_day date :=
        (
            v_now
            at time zone 'UTC'
        )::date;

    v_user_id uuid;

    v_valid boolean;

    v_state
        public.password_auth_attempt_state%rowtype;

    v_failure_count integer;

    v_window_started_at timestamptz;

    v_blocks_today integer;

    v_block_minutes integer;

    v_block_interval interval;

    v_had_failures boolean :=
        false;
begin
    -- --------------------------------------------------------
    -- Payload inesperado:
    -- preservar disponibilidade do Auth e não bloquear usuário
    -- por erro de integração.
    -- --------------------------------------------------------

    if
        event is null
        or jsonb_typeof(event) <> 'object'
        or nullif(
            btrim(
                coalesce(
                    event ->> 'user_id',
                    ''
                )
            ),
            ''
        ) is null
        or nullif(
            btrim(
                coalesce(
                    event ->> 'valid',
                    ''
                )
            ),
            ''
        ) is null
    then
        return jsonb_build_object(
            'decision',
            'continue'
        );
    end if;

    begin
        v_user_id :=
            (
                event ->> 'user_id'
            )::uuid;

        v_valid :=
            (
                event ->> 'valid'
            )::boolean;
    exception
        when invalid_text_representation then
            return jsonb_build_object(
                'decision',
                'continue'
            );
    end;

    -- --------------------------------------------------------
    -- Garante uma linha por usuário.
    -- O FOR UPDATE abaixo serializa tentativas concorrentes
    -- para o mesmo user_id.
    -- --------------------------------------------------------

    insert into
        public.password_auth_attempt_state (
            user_id,
            updated_at
        )
    values (
        v_user_id,
        v_now
    )
    on conflict (
        user_id
    )
    do nothing;

    select
        estado.*
    into
        v_state
    from
        public.password_auth_attempt_state
            as estado
    where
        estado.user_id =
            v_user_id
    for update;

    -- --------------------------------------------------------
    -- BLOQUEIO VIGENTE
    --
    -- Esta verificação ocorre ANTES de avaliar "valid".
    -- Portanto uma senha correta também é rejeitada enquanto
    -- blocked_until estiver no futuro.
    -- --------------------------------------------------------

    if
        v_state.blocked_until
            is not null
        and v_state.blocked_until >
            v_now
    then
        return jsonb_build_object(
            'decision',
            'reject',

            'message',
            'Não foi possível entrar. Verifique suas credenciais ou aguarde alguns minutos antes de tentar novamente.',

            'should_logout_user',
            false
        );
    end if;

    -- --------------------------------------------------------
    -- SENHA VÁLIDA E SEM BLOQUEIO VIGENTE
    -- --------------------------------------------------------

    if v_valid then
        v_had_failures :=
            coalesce(
                v_state.failure_count,
                0
            ) > 0
            or v_state.last_failed_at
                is not null;

        if v_had_failures then
            begin
                insert into
                    public.auditoria_sistema (
                        usuario_id,
                        usuario_email,
                        acao,
                        tabela,
                        registro_id,
                        descricao,
                        dados
                    )
                values (
                    v_user_id,
                    null,

                    'LOGIN_PASSWORD_SUCCESS_AFTER_FAILURES',

                    'password_auth_attempt_state',

                    v_user_id::text,

                    'Login por senha válido após falhas anteriores; contador de tentativas reiniciado.',

                    jsonb_build_object(
                        'failed_count_before_reset',
                        coalesce(
                            v_state.failure_count,
                            0
                        ),

                        'last_failed_at',
                        v_state.last_failed_at,

                        'last_blocked_at',
                        v_state.last_blocked_at
                    )
                );
            exception
                when others then
                    raise warning
                        'R2.6 password hook audit success failed: %',
                        sqlerrm;
            end;
        end if;

        update
            public.password_auth_attempt_state
        set
            failure_count =
                0,

            window_started_at =
                null,

            last_failed_at =
                null,

            blocked_until =
                null,

            updated_at =
                v_now
        where
            user_id =
                v_user_id;

        return jsonb_build_object(
            'decision',
            'continue'
        );
    end if;

    -- --------------------------------------------------------
    -- SENHA INVÁLIDA
    -- --------------------------------------------------------

    if
        v_state.window_started_at
            is null
        or v_now -
            v_state.window_started_at
            >= interval '15 minutes'
    then
        v_failure_count :=
            1;

        v_window_started_at :=
            v_now;
    else
        v_failure_count :=
            coalesce(
                v_state.failure_count,
                0
            ) + 1;

        v_window_started_at :=
            v_state.window_started_at;
    end if;

    -- --------------------------------------------------------
    -- AINDA ABAIXO DO LIMITE
    -- --------------------------------------------------------

    if
        v_failure_count < 5
    then
        update
            public.password_auth_attempt_state
        set
            failure_count =
                v_failure_count,

            window_started_at =
                v_window_started_at,

            last_failed_at =
                v_now,

            blocked_until =
                null,

            updated_at =
                v_now
        where
            user_id =
                v_user_id;

        return jsonb_build_object(
            'decision',
            'continue'
        );
    end if;

    -- --------------------------------------------------------
    -- 5ª FALHA DENTRO DA JANELA
    --
    -- Escalonamento diário:
    -- 1 = 15 min
    -- 2 = 30 min
    -- 3 = 60 min
    -- Demais ficam limitados ao nível 3.
    -- --------------------------------------------------------

    v_blocks_today :=
        case
            when
                v_state.block_day =
                    v_security_day
            then
                least(
                    coalesce(
                        v_state.blocks_today,
                        0
                    ) + 1,
                    3
                )
            else
                1
        end;

    v_block_minutes :=
        case
            when
                v_blocks_today = 1
            then
                15

            when
                v_blocks_today = 2
            then
                30

            else
                60
        end;

    v_block_interval :=
        make_interval(
            mins =>
                v_block_minutes
        );

    update
        public.password_auth_attempt_state
    set
        failure_count =
            0,

        window_started_at =
            null,

        last_failed_at =
            v_now,

        blocked_until =
            v_now +
            v_block_interval,

        block_day =
            v_security_day,

        blocks_today =
            v_blocks_today,

        last_blocked_at =
            v_now,

        updated_at =
            v_now
    where
        user_id =
            v_user_id;

    -- --------------------------------------------------------
    -- AUDITORIA
    --
    -- Somente evento de bloqueio.
    -- Nenhuma senha, hash ou valor informado é persistido.
    -- --------------------------------------------------------

    begin
        insert into
            public.auditoria_sistema (
                usuario_id,
                usuario_email,
                acao,
                tabela,
                registro_id,
                descricao,
                dados
            )
        values (
            v_user_id,
            null,

            'LOGIN_PASSWORD_TEMP_BLOCKED',

            'password_auth_attempt_state',

            v_user_id::text,

            'Bloqueio temporário de autenticação por excesso de tentativas de senha inválidas.',

            jsonb_build_object(
                'threshold',
                5,

                'window_minutes',
                15,

                'block_minutes',
                v_block_minutes,

                'blocks_today',
                v_blocks_today,

                'blocked_until',
                v_now +
                v_block_interval,

                'security_day_timezone',
                'UTC'
            )
        );
    exception
        when others then
            -- Falha de auditoria não pode derrubar o Auth Hook.
            raise warning
                'R2.6 password hook audit block failed: %',
                sqlerrm;
    end;

    return jsonb_build_object(
        'decision',
        'reject',

        'message',
        'Não foi possível entrar. Verifique suas credenciais ou aguarde alguns minutos antes de tentar novamente.',

        'should_logout_user',
        false
    );
end;
$function$;

comment on function
    public.hook_password_verification_attempt(jsonb)
is
    'Password Verification Hook do SafeScan: controla tentativas inválidas por user_id sem ler ou armazenar credenciais.';

alter function
    public.hook_password_verification_attempt(jsonb)
owner to postgres;

-- ============================================================
-- 4. PRIVILÉGIOS DA FUNÇÃO
-- ============================================================

revoke all
on function
    public.hook_password_verification_attempt(jsonb)
from public;

revoke all
on function
    public.hook_password_verification_attempt(jsonb)
from anon;

revoke all
on function
    public.hook_password_verification_attempt(jsonb)
from authenticated;

revoke all
on function
    public.hook_password_verification_attempt(jsonb)
from service_role;

grant execute
on function
    public.hook_password_verification_attempt(jsonb)
to supabase_auth_admin;

commit;

-- ============================================================
-- IMPORTANTE
--
-- Esta migration SOMENTE cria a estrutura e a função.
--
-- NÃO configura/ativa:
-- PASSWORD_VERIFICATION_ATTEMPT
--
-- A ativação do Auth Hook hospedado será feita somente em gate
-- posterior e com autorização explícita.
-- ============================================================