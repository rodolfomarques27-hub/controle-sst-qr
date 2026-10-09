begin;

-- ============================================================================
-- SAFESCAN BRASIL
-- PIN AUDITORIA R2.4
--
-- Auditoria / vistoria pública:
-- autenticação exclusivamente pelo Meu PIN de acesso.
--
-- p_email permanece nas assinaturas já publicadas apenas
-- por compatibilidade de contrato e passa a ser ignorado.
--
-- O backend identifica o usuário pelo PIN ativo e pela
-- autorização efetiva dentro do tenant/empresa.
--
-- Caso mais de um usuário autorizado possua o mesmo PIN,
-- o acesso é negado por ambiguidade.
--
-- O PIN de emergência empresarial permanece inalterado.
-- ============================================================================

do $preflight$
begin
    if to_regclass(
        'private.emergencia_qr_pins_usuarios'
    ) is null then
        raise exception
            'Dependencia ausente: private.emergencia_qr_pins_usuarios';
    end if;

    if to_regclass(
        'private.emergencia_qr_rate_limits'
    ) is null then
        raise exception
            'Dependencia ausente: private.emergencia_qr_rate_limits';
    end if;

    if to_regprocedure(
        'private.emergencia_qr_usuario_autorizado_empresa(uuid,uuid,uuid)'
    ) is null then
        raise exception
            'Dependencia ausente: emergencia_qr_usuario_autorizado_empresa';
    end if;

    if to_regprocedure(
        'private.emergencia_qr_rate_hash(text)'
    ) is null then
        raise exception
            'Dependencia ausente: emergencia_qr_rate_hash';
    end if;

    if to_regprocedure(
        'private.emergencia_qr_rate_registrar_falha(text,text,timestamp with time zone,interval,integer,interval)'
    ) is null then
        raise exception
            'Dependencia ausente: emergencia_qr_rate_registrar_falha';
    end if;

    if to_regprocedure(
        'private.emergencia_qr_pin_usuario_valido(uuid,uuid,text,text)'
    ) is null then
        raise exception
            'Dependencia ausente: emergencia_qr_pin_usuario_valido';
    end if;

    if to_regprocedure(
        'public.validar_acesso_auditoria_publica(text,text,text)'
    ) is null then
        raise exception
            'Dependencia ausente: validar_acesso_auditoria_publica';
    end if;
end
$preflight$;

create or replace function private.emergencia_qr_pin_usuario_valido(
    p_tenant_id uuid,
    p_empresa_id uuid,
    p_email text,
    p_pin text
)
returns uuid
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $function$
declare
    v_pin text :=
        pg_catalog.btrim(
            coalesce(
                p_pin,
                ''
            )
        );

    v_usuario uuid;

    v_matches integer :=
        0;

    v_registro record;
begin
    if p_tenant_id is null
       or p_empresa_id is null
       or v_pin !~ '^[0-9]{6,10}$'
    then
        return null;
    end if;

    for v_registro in
        select
            pin_usuario.user_id,
            pin_usuario.senha_hash
        from
            private.emergencia_qr_pins_usuarios
                pin_usuario
        where
            pin_usuario.tenant_id =
                p_tenant_id

            and pin_usuario.ativo
                is true

            and private.emergencia_qr_usuario_autorizado_empresa(
                p_tenant_id,
                p_empresa_id,
                pin_usuario.user_id
            )
    loop
        if v_registro.senha_hash =
            extensions.crypt(
                v_pin,
                v_registro.senha_hash
            )
        then
            v_matches :=
                v_matches + 1;

            v_usuario :=
                v_registro.user_id;

            if v_matches > 1 then
                return null;
            end if;
        end if;
    end loop;

    return v_usuario;
end;
$function$;

create or replace function public.validar_acesso_auditoria_publica(
    p_token text,
    p_email text,
    p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog'
as $function$
declare
    v_token text :=
        pg_catalog.btrim(
            coalesce(
                p_token,
                ''
            )
        );

    v_pin text :=
        pg_catalog.btrim(
            coalesce(
                p_pin,
                ''
            )
        );

    v_registro record;

    v_headers jsonb :=
        '{}'::jsonb;

    v_ip text;

    v_token_hash text;
    v_ip_hash text;
    v_token_ip_hash text;
    v_empresa_hash text;

    v_agora timestamptz :=
        pg_catalog.now();

    v_usuario_validado uuid;
begin
    if v_token = '' then
        return pg_catalog.jsonb_build_object(
            'ok',
            false,
            'autorizado',
            false,
            'mensagem',
            'Token publico da auditoria nao informado.'
        );
    end if;

    if v_pin !~ '^[0-9]{6,10}$' then
        return pg_catalog.jsonb_build_object(
            'ok',
            false,
            'autorizado',
            false,
            'mensagem',
            'PIN de acesso invalido.'
        );
    end if;

    select
        token_registro.id
            as token_id,

        token_registro.empresa_id,

        empresa.tenant_id
    into
        v_registro
    from
        public.auditoria_tokens_publicos
            token_registro

        join public.empresas
            empresa
          on empresa.id =
                token_registro.empresa_id

        join public.tenants
            tenant
          on tenant.id =
                empresa.tenant_id
    where
        pg_catalog.btrim(
            coalesce(
                token_registro.token,
                ''
            )
        ) =
        v_token

        and token_registro.ativo
            is true

        and (
            token_registro.data_expiracao
                is null

            or token_registro.data_expiracao >
                v_agora
        )

        and tenant.status =
            'ativo'
    order by
        token_registro.created_at desc
    limit 1;

    if not found then
        return pg_catalog.jsonb_build_object(
            'ok',
            false,
            'autorizado',
            false,
            'mensagem',
            'Token publico da auditoria invalido, inativo ou expirado.'
        );
    end if;

    begin
        v_headers :=
            coalesce(
                nullif(
                    pg_catalog.current_setting(
                        'request.headers',
                        true
                    ),
                    ''
                ),
                '{}'
            )::jsonb;
    exception
        when others then
            v_headers :=
                '{}'::jsonb;
    end;

    v_ip :=
        nullif(
            pg_catalog.btrim(
                pg_catalog.split_part(
                    coalesce(
                        v_headers ->>
                            'x-forwarded-for',
                        ''
                    ),
                    ',',
                    1
                )
            ),
            ''
        );

    v_token_hash :=
        private.emergencia_qr_rate_hash(
            'auditoria:' ||
            v_token
        );

    v_empresa_hash :=
        private.emergencia_qr_rate_hash(
            'auditoria_empresa:' ||
            v_registro.empresa_id::text
        );

    if v_ip is not null then
        v_ip_hash :=
            private.emergencia_qr_rate_hash(
                'auditoria_ip:' ||
                v_ip
            );

        v_token_ip_hash :=
            private.emergencia_qr_rate_hash(
                v_token_hash ||
                ':' ||
                v_ip_hash
            );

        perform
            pg_catalog.pg_advisory_xact_lock(
                pg_catalog.hashtextextended(
                    'auditoria-pin:ip:' ||
                    v_ip_hash,
                    0
                )
            );
    end if;

    perform
        pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'auditoria-pin:token:' ||
                v_token_hash,
                0
            )
        );

    perform
        pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'auditoria-pin:empresa:' ||
                v_empresa_hash,
                0
            )
        );

    delete from
        private.emergencia_qr_rate_limits
            rate_limit
    where
        rate_limit.updated_at <
            v_agora -
            interval '24 hours'

        and (
            rate_limit.locked_until
                is null

            or rate_limit.locked_until <=
                v_agora
        );

    if exists (
        select 1
        from
            private.emergencia_qr_rate_limits
                rate_limit
        where
            rate_limit.locked_until >
                v_agora

            and (
                (
                    rate_limit.scope_type =
                        'token'

                    and rate_limit.scope_hash =
                        v_token_hash
                )

                or (
                    v_ip_hash is not null

                    and rate_limit.scope_type =
                        'ip'

                    and rate_limit.scope_hash =
                        v_ip_hash
                )

                or (
                    v_token_ip_hash
                        is not null

                    and rate_limit.scope_type =
                        'token_ip'

                    and rate_limit.scope_hash =
                        v_token_ip_hash
                )

                or (
                    rate_limit.scope_type =
                        'empresa'

                    and rate_limit.scope_hash =
                        v_empresa_hash
                )
            )
    ) then
        return pg_catalog.jsonb_build_object(
            'ok',
            false,
            'autorizado',
            false,
            'limiteTemporario',
            true,
            'mensagem',
            'Muitas tentativas. Aguarde alguns minutos.'
        );
    end if;

    v_usuario_validado :=
        private.emergencia_qr_pin_usuario_valido(
            v_registro.tenant_id,
            v_registro.empresa_id,
            null,
            v_pin
        );

    if v_usuario_validado is null then
        if v_token_ip_hash
            is not null
        then
            perform 1
            from
                private.emergencia_qr_rate_registrar_falha(
                    'token_ip',
                    v_token_ip_hash,
                    v_agora,
                    interval '10 minutes',
                    5,
                    interval '5 minutes'
                );

            perform 1
            from
                private.emergencia_qr_rate_registrar_falha(
                    'ip',
                    v_ip_hash,
                    v_agora,
                    interval '10 minutes',
                    20,
                    interval '15 minutes'
                );
        end if;

        perform 1
        from
            private.emergencia_qr_rate_registrar_falha(
                'token',
                v_token_hash,
                v_agora,
                interval '10 minutes',
                10,
                interval '1 minute'
            );

        perform 1
        from
            private.emergencia_qr_rate_registrar_falha(
                'empresa',
                v_empresa_hash,
                v_agora,
                interval '10 minutes',
                8,
                interval '5 minutes'
            );

        insert into
            public.auditoria_sistema (
                acao,
                tabela,
                registro_id,
                descricao,
                dados
            )
        values (
            'ACESSO_AUDITORIA_QR_NEGADO',
            'auditoria_tokens_publicos',
            v_registro.token_id::text,
            'PIN pessoal invalido ou ambiguo na vistoria publica',

            pg_catalog.jsonb_build_object(
                'empresa_id',
                v_registro.empresa_id,

                'metodo',
                'pin_usuario'
            )
        );

        return pg_catalog.jsonb_build_object(
            'ok',
            false,
            'autorizado',
            false,
            'mensagem',
            'PIN de acesso invalido.'
        );
    end if;

    delete from
        private.emergencia_qr_rate_limits
            rate_limit
    where
        (
            rate_limit.scope_type =
                'token'

            and rate_limit.scope_hash =
                v_token_hash
        )

        or (
            v_token_ip_hash
                is not null

            and rate_limit.scope_type =
                'token_ip'

            and rate_limit.scope_hash =
                v_token_ip_hash
        )

        or (
            rate_limit.scope_type =
                'empresa'

            and rate_limit.scope_hash =
                v_empresa_hash
        );

    insert into
        public.auditoria_sistema (
            usuario_id,
            acao,
            tabela,
            registro_id,
            descricao,
            dados
        )
    values (
        v_usuario_validado,
        'ACESSO_AUDITORIA_QR_LIBERADO',
        'auditoria_tokens_publicos',
        v_registro.token_id::text,
        'Vistoria publica liberada por PIN pessoal',

        pg_catalog.jsonb_build_object(
            'empresa_id',
            v_registro.empresa_id,

            'metodo',
            'pin_usuario'
        )
    );

    return pg_catalog.jsonb_build_object(
        'ok',
        true,
        'autorizado',
        true,
        'mensagem',
        'Acesso liberado.',
        'token_id',
        v_registro.token_id
    );
end;
$function$;

commit;
