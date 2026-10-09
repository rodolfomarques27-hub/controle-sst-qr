begin;

do $preflight$
begin
    if to_regprocedure(
        'private.emergencia_qr_pin_usuario_valido(uuid,uuid,text,text)'
    ) is null
       or to_regprocedure(
        'private.emergencia_qr_rate_hash(text)'
    ) is null
       or to_regprocedure(
        'private.emergencia_qr_rate_registrar_falha(text,text,timestamp with time zone,interval,integer,interval)'
    ) is null
       or to_regprocedure(
        'public.validar_contato_emergencia_qr(text,text)'
    ) is null then

        raise exception 'Dependencias da validacao individual ausentes.';
    end if;

    if to_regprocedure(
        'public.validar_contato_emergencia_qr_individual(text,text,text)'
    ) is not null then
        raise exception 'RPC individual ja existe.';
    end if;
end;
$preflight$;

do $g2i1f$
declare
    v_ddl text;
    v_old text := 'IF p_scope_type NOT IN (''token_ip'', ''ip'', ''token'', ''empresa'') THEN';
begin
    if (
        select pg_catalog.pg_get_constraintdef(c.oid)
        from pg_catalog.pg_constraint c
        where c.conrelid = 'private.emergencia_qr_rate_limits'::regclass
          and c.conname = 'emergencia_qr_rate_limits_scope_check'
    ) is distinct from
       'CHECK ((scope_type = ANY (ARRAY[''token_ip''::text, ''ip''::text, ''token''::text, ''empresa''::text])))'
    then
        raise exception 'G2-I1F: CHECK divergente';
    end if;

    select pg_catalog.pg_get_functiondef(
        'private.emergencia_qr_rate_registrar_falha(text,text,timestamp with time zone,interval,integer,interval)'::regprocedure
    ) into v_ddl;

    if pg_catalog.strpos(v_ddl, v_old) = 0 then
        raise exception 'G2-I1F: funcao divergente';
    end if;

    execute pg_catalog.replace(
        v_ddl,
        v_old,
        'IF p_scope_type NOT IN (''token_ip'', ''ip'', ''token'', ''empresa'', ''empresa_usuario'') THEN'
    );
end;
$g2i1f$;

alter table private.emergencia_qr_rate_limits
    drop constraint emergencia_qr_rate_limits_scope_check;

alter table private.emergencia_qr_rate_limits
    add constraint emergencia_qr_rate_limits_scope_check
    check (scope_type in (
        'token_ip', 'ip', 'token', 'empresa', 'empresa_usuario'
    ));

create function public.validar_contato_emergencia_qr_individual(
    p_token text,
    p_pin text,
    p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $func$
declare
    v_token text := pg_catalog.btrim(coalesce(p_token, ''));
    v_pin text := pg_catalog.btrim(coalesce(p_pin, ''));
    v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));
    v_qr record;
    v_headers jsonb := '{}'::jsonb;
    v_ip text;
    v_token_hash text;
    v_ip_hash text;
    v_token_ip_hash text;
    v_empresa_hash text;
    v_empresa_usuario_hash text;
    v_agora timestamptz := pg_catalog.now();
    v_usuario_validado uuid;
begin
    if v_token = '' then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'Token QR nao informado.'
        );
    end if;

    select
        c.id as colaborador_id,
        c.contato_emergencia_nome,
        c.contato_emergencia_parentesco,
        c.contato_emergencia_telefone,
        e.id as empresa_id,
        coalesce(e.emergencia_qr_ativo, false) as emergencia_qr_ativo,
        e.tenant_id
    into v_qr
    from public.colaboradores c
    join public.empresas e
      on e.id = c.empresa_id
    join public.tenants t
      on t.id = e.tenant_id
    where pg_catalog.btrim(coalesce(c.token_qr, '')) = v_token
      and t.status = 'ativo'
    limit 1;

    if not found then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'QR do colaborador nao localizado.'
        );
    end if;

    if v_qr.emergencia_qr_ativo is not true then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'Contato de emergencia desativado para esta empresa.'
        );
    end if;

    if nullif(
        pg_catalog.btrim(
            coalesce(v_qr.contato_emergencia_telefone, '')
        ),
        ''
    ) is null then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'Contato de emergencia nao cadastrado.'
        );
    end if;

    begin
        v_headers := coalesce(
            nullif(pg_catalog.current_setting('request.headers', true), ''),
            '{}'
        )::jsonb;
    exception
        when others then
            v_headers := '{}'::jsonb;
    end;

    v_ip := nullif(
        pg_catalog.btrim(
            pg_catalog.split_part(
                coalesce(v_headers ->> 'x-forwarded-for', ''),
                ',',
                1
            )
        ),
        ''
    );

    v_token_hash := private.emergencia_qr_rate_hash(v_token);
    v_empresa_hash := private.emergencia_qr_rate_hash(
        v_qr.empresa_id::text
    );

    if v_email <> '' then
        v_empresa_usuario_hash := private.emergencia_qr_rate_hash(
            'empresa_usuario:' || v_qr.empresa_id::text || ':' || v_email
        );
    end if;

    if v_ip is not null then
        v_ip_hash := private.emergencia_qr_rate_hash(v_ip);
        v_token_ip_hash := private.emergencia_qr_rate_hash(
            v_token_hash || ':' || v_ip_hash
        );

        perform pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'emergencia-qr:ip:' || v_ip_hash,
                0
            )
        );
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
            'emergencia-qr:token:' || v_token_hash,
            0
        )
    );

    if v_empresa_usuario_hash is not null then
        perform pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'emergencia-qr:empresa_usuario:' || v_empresa_usuario_hash,
                0
            )
        );
    end if;

    delete from private.emergencia_qr_rate_limits r
    where r.updated_at < v_agora - interval '24 hours'
      and (
          r.locked_until is null
          or r.locked_until <= v_agora
      );

    if exists (
        select 1
        from private.emergencia_qr_rate_limits r
        where r.locked_until > v_agora
          and (
              (r.scope_type = 'token'
                  and r.scope_hash = v_token_hash)
              or (
                  v_ip_hash is not null
                  and r.scope_type = 'ip'
                  and r.scope_hash = v_ip_hash
              )
              or (
                  v_token_ip_hash is not null
                  and r.scope_type = 'token_ip'
                  and r.scope_hash = v_token_ip_hash
              )
          )
    ) then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'limiteTemporario', true,
            'mensagem', 'Muitas tentativas. Aguarde alguns minutos.'
        );
    end if;

    if v_empresa_usuario_hash is not null and exists (
        select 1
        from private.emergencia_qr_rate_limits r
        where r.scope_type = 'empresa_usuario'
          and r.scope_hash = v_empresa_usuario_hash
          and r.locked_until > v_agora
    ) then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'limiteTemporario', true,
            'mensagem', 'Muitas tentativas. Aguarde alguns minutos.'
        );
    end if;

    v_usuario_validado := private.emergencia_qr_pin_usuario_valido(
        v_qr.tenant_id,
        v_qr.empresa_id,
        v_email,
        v_pin
    );

    if v_usuario_validado is null then

        if v_token_ip_hash is not null then
            perform 1 from private.emergencia_qr_rate_registrar_falha(
                'token_ip', v_token_ip_hash, v_agora,
                interval '10 minutes', 5, interval '5 minutes'
            );

            perform 1 from private.emergencia_qr_rate_registrar_falha(
                'ip', v_ip_hash, v_agora,
                interval '10 minutes', 20, interval '15 minutes'
            );
        end if;

        perform 1 from private.emergencia_qr_rate_registrar_falha(
            'token', v_token_hash, v_agora,
            interval '10 minutes', 10, interval '1 minute'
        );

        perform 1 from private.emergencia_qr_rate_registrar_falha(
            'empresa', v_empresa_hash, v_agora,
            interval '10 minutes', 30, null
        );

        if v_empresa_usuario_hash is not null then
            perform 1 from private.emergencia_qr_rate_registrar_falha(
                'empresa_usuario', v_empresa_usuario_hash, v_agora,
                interval '10 minutes', 8, interval '5 minutes'
            );
        end if;

        insert into public.auditoria_sistema (
            acao, tabela, registro_id, descricao, dados
        )
        values (
            'ACESSO_CONTATO_EMERGENCIA_QR_NEGADO',
            'colaboradores',
            v_qr.colaborador_id::text,
            'PIN individual invalido na consulta publica QR',
            pg_catalog.jsonb_build_object(
                'colaborador_id', v_qr.colaborador_id,
                'empresa_id', v_qr.empresa_id,
                'metodo', 'pin_individual'
            )
        );

        return pg_catalog.jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'PIN de emergencia invalido.'
        );
    end if;

    delete from private.emergencia_qr_rate_limits r
    where (
        r.scope_type = 'token'
        and r.scope_hash = v_token_hash
    )
    or (
        v_token_ip_hash is not null
        and r.scope_type = 'token_ip'
        and r.scope_hash = v_token_ip_hash
    );

    if v_empresa_usuario_hash is not null then
        delete from private.emergencia_qr_rate_limits r
        where r.scope_type = 'empresa_usuario'
          and r.scope_hash = v_empresa_usuario_hash;
    end if;

    insert into public.auditoria_sistema (
        usuario_id, acao, tabela, registro_id, descricao, dados
    )
    values (
        v_usuario_validado,
        'ACESSO_CONTATO_EMERGENCIA_QR_LIBERADO',
        'colaboradores',
        v_qr.colaborador_id::text,
        'Contato QR liberado por PIN individual',
        pg_catalog.jsonb_build_object(
            'colaborador_id', v_qr.colaborador_id,
            'empresa_id', v_qr.empresa_id,
            'credencial_user_id', v_usuario_validado,
            'metodo', 'pin_individual_email'
        )
    );

    return pg_catalog.jsonb_build_object(
        'ok', true,
        'autorizado', true,
        'mensagem', 'Contato de emergencia liberado.',
        'contatoEmergencia', pg_catalog.jsonb_build_object(
            'nome', v_qr.contato_emergencia_nome,
            'parentesco', v_qr.contato_emergencia_parentesco,
            'telefone', v_qr.contato_emergencia_telefone
        )
    );
end;
$func$;

revoke all on function
    public.validar_contato_emergencia_qr_individual(text,text,text)
from public, anon, authenticated;


commit;