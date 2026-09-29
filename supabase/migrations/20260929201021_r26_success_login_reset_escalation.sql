create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
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

    if v_valid then
        v_had_failures :=
            coalesce(
                v_state.failure_count,
                0
            ) > 0
            or v_state.last_failed_at
                is not null
            or coalesce(
                v_state.blocks_today,
                0
            ) > 0
            or v_state.block_day
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

                    'Login por senha válido após falhas ou bloqueio anterior; contador e escalada de bloqueio reiniciados.',

                    jsonb_build_object(
                        'failed_count_before_reset',
                        coalesce(
                            v_state.failure_count,
                            0
                        ),

                        'blocks_today_before_reset',
                        coalesce(
                            v_state.blocks_today,
                            0
                        ),

                        'block_day_before_reset',
                        v_state.block_day,

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

            blocks_today =
                0,

            block_day =
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
