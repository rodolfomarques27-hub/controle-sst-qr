begin;

-- ============================================================================
-- SAFESCAN BRASIL
-- PIN R2 — DOIS PINS INDEPENDENTES
--
-- CONTRATO:
-- 1. PIN DA EMPRESA:
--    exclusivamente contato de emergencia do colaborador.
--
-- 2. PIN PESSOAL DO USUARIO:
--    exclusivamente Auditoria / Vistoria publica.
--
-- Nenhuma alternancia empresarial x individual participa da UX.
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

    if to_regclass(
        'public.auditoria_tokens_publicos'
    ) is null then
        raise exception
            'Dependencia ausente: public.auditoria_tokens_publicos';
    end if;

    if to_regclass(
        'public.auditoria_usuarios_autorizados'
    ) is null then
        raise exception
            'Dependencia ausente: public.auditoria_usuarios_autorizados';
    end if;

    if to_regprocedure(
        'private.emergencia_qr_pin_usuario_valido(uuid,uuid,text,text)'
    ) is null then
        raise exception
            'Dependencia ausente: private.emergencia_qr_pin_usuario_valido';
    end if;

    if to_regprocedure(
        'private.emergencia_qr_rate_hash(text)'
    ) is null then
        raise exception
            'Dependencia ausente: private.emergencia_qr_rate_hash';
    end if;

    if to_regprocedure(
        'private.emergencia_qr_rate_registrar_falha(text,text,timestamp with time zone,interval,integer,interval)'
    ) is null then
        raise exception
            'Dependencia ausente: private.emergencia_qr_rate_registrar_falha';
    end if;

    if to_regprocedure(
        'public.validar_contato_emergencia_qr_empresa_legado(text,text)'
    ) is null then
        raise exception
            'Dependencia ausente: PIN empresarial de emergencia';
    end if;

    if to_regprocedure(
        'public.listar_empresas_auditoria_publica(text,text)'
    ) is null then
        raise exception
            'Dependencia ausente: listar_empresas_auditoria_publica legado';
    end if;

    if to_regprocedure(
        'public.salvar_auditoria_campo_publica(text,jsonb)'
    ) is null then
        raise exception
            'Dependencia ausente: salvar_auditoria_campo_publica base';
    end if;

    if to_regprocedure(
        'public.salvar_auditoria_campo_publica_multifotos(text,text,jsonb,jsonb)'
    ) is null then
        raise exception
            'Dependencia ausente: salvar_auditoria_campo_publica_multifotos legado';
    end if;
end
$preflight$;

-- ============================================================================
-- 1. ELEGIBILIDADE DO PIN PESSOAL
--
-- O armazenamento existente por tenant + usuario é reaproveitado.
-- Nenhum PIN empresarial é consultado aqui.
-- ============================================================================

create or replace function private.emergencia_qr_usuario_elegivel(
    p_tenant_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog'
as $function$
    select
        p_tenant_id is not null

        and p_user_id is not null

        and exists (
            select 1
            from public.tenants tenant
            where tenant.id = p_tenant_id
              and tenant.status = 'ativo'
        )

        and exists (
            select 1
            from public.usuarios_permissoes_sistema usuario
            where usuario.user_id = p_user_id
              and coalesce(usuario.ativo, false) = true
              and coalesce(usuario.bloqueado, false) = false
              and coalesce(usuario.excluido, false) = false
              and lower(
                    pg_catalog.btrim(
                        coalesce(
                            usuario.perfil,
                            ''
                        )
                    )
                  ) <> 'bloqueado'
        )

        and (
            exists (
                select 1
                from public.usuarios_permissoes_sistema global_usuario
                where global_usuario.user_id = p_user_id
                  and coalesce(global_usuario.ativo, false) = true
                  and coalesce(global_usuario.bloqueado, false) = false
                  and coalesce(global_usuario.excluido, false) = false
                  and coalesce(global_usuario.acesso_global, false) = true
            )

            or exists (
                select 1
                from public.tenant_memberships membership
                where membership.tenant_id = p_tenant_id
                  and membership.user_id = p_user_id
                  and membership.status = 'ativo'
            )

            or exists (
                select 1
                from public.auditoria_usuarios_autorizados autorizacao
                where autorizacao.user_id = p_user_id
                  and coalesce(autorizacao.ativo, false) = true
                  and (
                      coalesce(autorizacao.acesso_global, false) = true
                      or lower(
                          pg_catalog.btrim(
                              coalesce(
                                  autorizacao.perfil,
                                  ''
                              )
                          )
                      ) in (
                          'admin',
                          'administrador'
                      )
                      or coalesce(
                          autorizacao.pode_acessar_auditoria,
                          false
                      ) = true
                  )
                  and (
                      autorizacao.empresa_id is null
                      or exists (
                          select 1
                          from public.empresas empresa
                          where empresa.id = autorizacao.empresa_id
                            and empresa.tenant_id = p_tenant_id
                      )
                  )
            )
        );
$function$;

create or replace function private.emergencia_qr_usuario_autorizado_empresa(
    p_tenant_id uuid,
    p_empresa_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog'
as $function$
    select
        p_tenant_id is not null

        and p_empresa_id is not null

        and p_user_id is not null

        and private.emergencia_qr_usuario_elegivel(
            p_tenant_id,
            p_user_id
        )

        and exists (
            select 1
            from public.empresas empresa
            join public.tenants tenant
              on tenant.id = empresa.tenant_id
            where empresa.id = p_empresa_id
              and empresa.tenant_id = p_tenant_id
              and tenant.status = 'ativo'
        )

        and public.tenant_tem_modulo(
            p_tenant_id,
            'auditoria_campo'
        )

        and (
            exists (
                select 1
                from public.usuarios_permissoes_sistema global_usuario
                where global_usuario.user_id = p_user_id
                  and coalesce(global_usuario.ativo, false) = true
                  and coalesce(global_usuario.bloqueado, false) = false
                  and coalesce(global_usuario.excluido, false) = false
                  and coalesce(global_usuario.acesso_global, false) = true
            )

            or exists (
                select 1
                from public.tenant_memberships membership
                where membership.tenant_id = p_tenant_id
                  and membership.user_id = p_user_id
                  and membership.status = 'ativo'
                  and (
                      membership.papel = 'administrador'

                      or membership.escopo_empresas = 'todas'

                      or (
                          membership.escopo_empresas = 'selecionadas'

                          and public.membership_tem_empresa_selecionada(
                              membership.id,
                              p_empresa_id
                          )
                      )
                  )
            )

            or exists (
                select 1
                from public.auditoria_usuarios_autorizados autorizacao
                where autorizacao.user_id = p_user_id
                  and coalesce(autorizacao.ativo, false) = true
                  and (
                      autorizacao.empresa_id is null
                      or autorizacao.empresa_id = p_empresa_id
                  )
                  and (
                      coalesce(autorizacao.acesso_global, false) = true

                      or lower(
                          pg_catalog.btrim(
                              coalesce(
                                  autorizacao.perfil,
                                  ''
                              )
                          )
                      ) in (
                          'admin',
                          'administrador'
                      )

                      or coalesce(
                          autorizacao.pode_acessar_auditoria,
                          false
                      ) = true
                  )
            )

            or (
                not exists (
                    select 1
                    from public.tenant_memberships membership
                    where membership.tenant_id = p_tenant_id
                      and membership.user_id = p_user_id
                )

                and exists (
                    select 1
                    from public.usuarios_permissoes_sistema usuario
                    where usuario.user_id = p_user_id
                      and usuario.empresa_id = p_empresa_id
                      and coalesce(usuario.ativo, false) = true
                      and coalesce(usuario.bloqueado, false) = false
                      and coalesce(usuario.excluido, false) = false
                )
            )
        );
$function$;

-- ============================================================================
-- 2. CONTATO DE EMERGENCIA
--
-- SEMPRE PIN DA EMPRESA.
-- p_email é mantido somente para compatibilidade de assinatura.
-- ============================================================================

create or replace function public.validar_contato_emergencia_qr(
    p_token text,
    p_senha text,
    p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog'
as $function$
begin
    return public.validar_contato_emergencia_qr_empresa_legado(
        p_token,
        p_senha
    );
end;
$function$;

-- ============================================================================
-- 3. AUDITORIA / VISTORIA
--
-- EMAIL + PIN PESSOAL.
-- ============================================================================

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

    v_email text :=
        pg_catalog.lower(
            pg_catalog.btrim(
                coalesce(
                    p_email,
                    ''
                )
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
    v_empresa_usuario_hash text;

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

    if v_email = ''
       or pg_catalog.length(v_email) > 254
       or v_email !~
            '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
       or v_pin !~
            '^[0-9]{6,10}$'
    then
        return pg_catalog.jsonb_build_object(
            'ok',
            false,
            'autorizado',
            false,
            'mensagem',
            'E-mail ou PIN de acesso invalido.'
        );
    end if;

    select
        token_registro.id as token_id,
        token_registro.empresa_id,
        empresa.tenant_id
    into
        v_registro
    from public.auditoria_tokens_publicos token_registro
    join public.empresas empresa
      on empresa.id = token_registro.empresa_id
    join public.tenants tenant
      on tenant.id = empresa.tenant_id
    where pg_catalog.btrim(
              coalesce(
                  token_registro.token,
                  ''
              )
          ) = v_token
      and token_registro.ativo is true
      and (
          token_registro.data_expiracao is null
          or token_registro.data_expiracao > v_agora
      )
      and tenant.status = 'ativo'
    order by token_registro.created_at desc
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
                        v_headers ->> 'x-forwarded-for',
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

    v_empresa_usuario_hash :=
        private.emergencia_qr_rate_hash(
            'auditoria_empresa_usuario:' ||
            v_registro.empresa_id::text ||
            ':' ||
            v_email
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

        perform pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'auditoria-pin:ip:' ||
                v_ip_hash,
                0
            )
        );
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
            'auditoria-pin:token:' ||
            v_token_hash,
            0
        )
    );

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
            'auditoria-pin:usuario:' ||
            v_empresa_usuario_hash,
            0
        )
    );

    delete from private.emergencia_qr_rate_limits rate_limit
    where rate_limit.updated_at <
              v_agora - interval '24 hours'
      and (
          rate_limit.locked_until is null
          or rate_limit.locked_until <= v_agora
      );

    if exists (
        select 1
        from private.emergencia_qr_rate_limits rate_limit
        where rate_limit.locked_until > v_agora
          and (
              (
                  rate_limit.scope_type = 'token'
                  and rate_limit.scope_hash = v_token_hash
              )

              or (
                  v_ip_hash is not null
                  and rate_limit.scope_type = 'ip'
                  and rate_limit.scope_hash = v_ip_hash
              )

              or (
                  v_token_ip_hash is not null
                  and rate_limit.scope_type = 'token_ip'
                  and rate_limit.scope_hash = v_token_ip_hash
              )

              or (
                  rate_limit.scope_type = 'empresa_usuario'
                  and rate_limit.scope_hash =
                      v_empresa_usuario_hash
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
            v_email,
            v_pin
        );

    if v_usuario_validado is null then

        if v_token_ip_hash is not null then
            perform 1
            from private.emergencia_qr_rate_registrar_falha(
                'token_ip',
                v_token_ip_hash,
                v_agora,
                interval '10 minutes',
                5,
                interval '5 minutes'
            );

            perform 1
            from private.emergencia_qr_rate_registrar_falha(
                'ip',
                v_ip_hash,
                v_agora,
                interval '10 minutes',
                20,
                interval '15 minutes'
            );
        end if;

        perform 1
        from private.emergencia_qr_rate_registrar_falha(
            'token',
            v_token_hash,
            v_agora,
            interval '10 minutes',
            10,
            interval '1 minute'
        );

        perform 1
        from private.emergencia_qr_rate_registrar_falha(
            'empresa_usuario',
            v_empresa_usuario_hash,
            v_agora,
            interval '10 minutes',
            8,
            interval '5 minutes'
        );

        insert into public.auditoria_sistema (
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
            'PIN pessoal invalido na vistoria publica',
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
            'E-mail ou PIN de acesso invalido.'
        );
    end if;

    delete from private.emergencia_qr_rate_limits rate_limit
    where (
        rate_limit.scope_type = 'token'
        and rate_limit.scope_hash = v_token_hash
    )

    or (
        v_token_ip_hash is not null
        and rate_limit.scope_type = 'token_ip'
        and rate_limit.scope_hash = v_token_ip_hash
    )

    or (
        rate_limit.scope_type = 'empresa_usuario'
        and rate_limit.scope_hash =
            v_empresa_usuario_hash
    );

    insert into public.auditoria_sistema (
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

-- ============================================================================
-- 4. LISTAGEM CONTROLADA DE EMPRESAS
-- EMAIL + PIN PESSOAL
-- ============================================================================

create or replace function public.listar_empresas_auditoria_publica(
    p_token text,
    p_email text,
    p_pin text
)
returns table(
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
set search_path = 'pg_catalog', 'public'
as $function$
declare
    v_validacao jsonb;
    v_senha_legada text;
begin
    v_validacao :=
        public.validar_acesso_auditoria_publica(
            p_token,
            p_email,
            p_pin
        );

    if coalesce(
        (
            v_validacao ->> 'autorizado'
        )::boolean,
        false
    ) is not true then
        raise exception using
            errcode = '42501',
            message =
                coalesce(
                    nullif(
                        v_validacao ->> 'mensagem',
                        ''
                    ),
                    'Acesso publico da auditoria nao autorizado.'
                );
    end if;

    select
        token_registro.senha_acesso
    into
        v_senha_legada
    from public.auditoria_tokens_publicos token_registro
    where pg_catalog.btrim(
              coalesce(
                  token_registro.token,
                  ''
              )
          ) =
          pg_catalog.btrim(
              coalesce(
                  p_token,
                  ''
              )
          )
      and token_registro.ativo is true
      and (
          token_registro.data_expiracao is null
          or token_registro.data_expiracao >
              pg_catalog.now()
      )
    order by token_registro.created_at desc
    limit 1;

    return query
    select *
    from public.listar_empresas_auditoria_publica(
        p_token,
        coalesce(
            v_senha_legada,
            ''
        )
    );
end;
$function$;

-- ============================================================================
-- 5. SALVAMENTO PUBLICO
-- EMAIL + PIN PESSOAL
-- ============================================================================

create or replace function public.salvar_auditoria_campo_publica(
    p_token text,
    p_email text,
    p_pin text,
    p_dados jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
declare
    v_validacao jsonb;
begin
    v_validacao :=
        public.validar_acesso_auditoria_publica(
            p_token,
            p_email,
            p_pin
        );

    if coalesce(
        (
            v_validacao ->> 'autorizado'
        )::boolean,
        false
    ) is not true then
        raise exception using
            errcode = '42501',
            message =
                coalesce(
                    nullif(
                        v_validacao ->> 'mensagem',
                        ''
                    ),
                    'Acesso publico da auditoria nao autorizado.'
                );
    end if;

    return public.salvar_auditoria_campo_publica(
        p_token,
        p_dados
    );
end;
$function$;

-- ============================================================================
-- 6. SALVAMENTO MULTIFOTOS
-- EMAIL + PIN PESSOAL
-- ============================================================================

create or replace function public.salvar_auditoria_campo_publica_multifotos(
    p_token text,
    p_email text,
    p_pin text,
    p_dados jsonb,
    p_fotos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
declare
    v_validacao jsonb;
    v_senha_legada text;
begin
    v_validacao :=
        public.validar_acesso_auditoria_publica(
            p_token,
            p_email,
            p_pin
        );

    if coalesce(
        (
            v_validacao ->> 'autorizado'
        )::boolean,
        false
    ) is not true then
        raise exception using
            errcode = '42501',
            message =
                coalesce(
                    nullif(
                        v_validacao ->> 'mensagem',
                        ''
                    ),
                    'Acesso publico da auditoria nao autorizado.'
                );
    end if;

    select
        token_registro.senha_acesso
    into
        v_senha_legada
    from public.auditoria_tokens_publicos token_registro
    where pg_catalog.btrim(
              coalesce(
                  token_registro.token,
                  ''
              )
          ) =
          pg_catalog.btrim(
              coalesce(
                  p_token,
                  ''
              )
          )
      and token_registro.ativo is true
      and (
          token_registro.data_expiracao is null
          or token_registro.data_expiracao >
              pg_catalog.now()
      )
    order by token_registro.created_at desc
    limit 1;

    return public.salvar_auditoria_campo_publica_multifotos(
        p_token,
        coalesce(
            v_senha_legada,
            ''
        ),
        p_dados,
        p_fotos
    );
end;
$function$;

-- ============================================================================
-- 7. PRIVILEGIOS DOS NOVOS OVERLOADS
-- ============================================================================

revoke all
on function public.validar_acesso_auditoria_publica(
    text,
    text,
    text
)
from public;

grant execute
on function public.validar_acesso_auditoria_publica(
    text,
    text,
    text
)
to
    anon,
    authenticated,
    service_role;

revoke all
on function public.listar_empresas_auditoria_publica(
    text,
    text,
    text
)
from public;

grant execute
on function public.listar_empresas_auditoria_publica(
    text,
    text,
    text
)
to
    anon,
    authenticated,
    service_role;

revoke all
on function public.salvar_auditoria_campo_publica(
    text,
    text,
    text,
    jsonb
)
from public;

grant execute
on function public.salvar_auditoria_campo_publica(
    text,
    text,
    text,
    jsonb
)
to
    anon,
    authenticated,
    service_role;

revoke all
on function public.salvar_auditoria_campo_publica_multifotos(
    text,
    text,
    text,
    jsonb,
    jsonb
)
from public;

grant execute
on function public.salvar_auditoria_campo_publica_multifotos(
    text,
    text,
    text,
    jsonb,
    jsonb
)
to
    anon,
    authenticated,
    service_role;

commit;
