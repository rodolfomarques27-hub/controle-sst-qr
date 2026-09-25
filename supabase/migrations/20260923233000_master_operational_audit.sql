begin;

-- ============================================================
-- A3-A12 — AUDITORIA OPERACIONAL DA CONTA MESTRE
--
-- Reutiliza public.auditoria_sistema.
-- Não cria tabela adicional.
-- Não substitui as funções de segurança já homologadas.
-- ============================================================

do $preflight$
begin
    if to_regclass(
        'public.auditoria_sistema'
    ) is null then
        raise exception
            'A3-A12: auditoria_sistema ausente.';
    end if;

    if to_regclass(
        'public.conta_mestre_seguranca'
    ) is null then
        raise exception
            'A3-A12: conta_mestre_seguranca ausente.';
    end if;

    if to_regclass(
        'public.usuarios_permissoes_sistema'
    ) is null then
        raise exception
            'A3-A12: usuarios_permissoes_sistema ausente.';
    end if;

    if to_regclass(
        'public.auditoria_usuarios_autorizados'
    ) is null then
        raise exception
            'A3-A12: auditoria_usuarios_autorizados ausente.';
    end if;
end;
$preflight$;

-- ============================================================
-- IDENTIDADE DA CONTA MESTRE POR USER_ID
--
-- Utilizada somente pelas rotinas server-side de auditoria.
-- Não depende de auth.uid(), pois triggers de auth.users podem
-- executar em contexto administrativo interno do Auth.
-- ============================================================

create or replace function
    public.a3_a12_usuario_conta_mestre(
        p_user_id uuid
    )
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
    select
        p_user_id is not null

        and exists (
            select
                1
            from
                public.usuarios_permissoes_sistema
                    as permissao
            where
                permissao.user_id =
                    p_user_id
                and coalesce(
                    permissao.ativo,
                    false
                ) = true
                and coalesce(
                    permissao.bloqueado,
                    false
                ) = false
                and coalesce(
                    permissao.excluido,
                    false
                ) = false
                and coalesce(
                    permissao.acesso_global,
                    false
                ) = true
                and permissao.empresa_id
                    is null
        )

        and exists (
            select
                1
            from
                public.auditoria_usuarios_autorizados
                    as autorizacao
            where
                autorizacao.user_id =
                    p_user_id
                and coalesce(
                    autorizacao.ativo,
                    false
                ) = true
                and coalesce(
                    autorizacao.acesso_global,
                    false
                ) = true
                and autorizacao.empresa_id
                    is null
        );
$function$;

revoke all
on function
    public.a3_a12_usuario_conta_mestre(uuid)
from public;

revoke all
on function
    public.a3_a12_usuario_conta_mestre(uuid)
from anon;

revoke all
on function
    public.a3_a12_usuario_conta_mestre(uuid)
from authenticated;

-- ============================================================
-- AUTH.USERS — EMAIL E SENHA
-- ============================================================

create or replace function
    public.a3_a12_auditar_auth_conta_mestre()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_email text;
begin
    if not public.a3_a12_usuario_conta_mestre(
        new.id
    ) then
        return new;
    end if;

    v_email :=
        nullif(
            lower(
                btrim(
                    coalesce(
                        new.email,
                        ''
                    )
                )
            ),
            ''
        );

    if
        new.email
        is distinct from
        old.email
    then
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
            new.id,
            v_email,
            'MASTER_EMAIL_CHANGED',
            'auth.users',
            new.id::text,
            'E-mail da Conta Mestre alterado no Supabase Auth.',
            jsonb_build_object(
                'origem',
                'auth.users'
            )
        );
    end if;

    if
        new.encrypted_password
        is distinct from
        old.encrypted_password
    then
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
            new.id,
            v_email,
            'MASTER_PASSWORD_CHANGED',
            'auth.users',
            new.id::text,
            'Senha da Conta Mestre alterada no Supabase Auth.',
            jsonb_build_object(
                'origem',
                'auth.users'
            )
        );
    end if;

    return new;
end;
$function$;

drop trigger if exists
    trg_a3_a12_auditar_auth_conta_mestre
on
    auth.users;

create trigger
    trg_a3_a12_auditar_auth_conta_mestre
after update of
    email,
    encrypted_password
on
    auth.users
for each row
execute function
    public.a3_a12_auditar_auth_conta_mestre();

-- ============================================================
-- CONCLUSÃO DA ROTAÇÃO OBRIGATÓRIA
-- ============================================================

create or replace function
    public.a3_a12_auditar_rotacao_conta_mestre()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_email text;
begin
    if not (
        coalesce(
            old.rotacao_senha_obrigatoria,
            false
        ) = true
        and coalesce(
            new.rotacao_senha_obrigatoria,
            false
        ) = false
    ) then
        return new;
    end if;

    if not public.a3_a12_usuario_conta_mestre(
        new.user_id
    ) then
        return new;
    end if;

    select
        nullif(
            lower(
                btrim(
                    coalesce(
                        usuario.email,
                        ''
                    )
                )
            ),
            ''
        )
    into
        v_email
    from
        auth.users as usuario
    where
        usuario.id =
            new.user_id;

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
        new.user_id,
        v_email,
        'MASTER_PASSWORD_ROTATION_COMPLETED',
        'conta_mestre_seguranca',
        new.user_id::text,
        'Rotação obrigatória da senha da Conta Mestre concluída.',
        jsonb_build_object(
            'origem',
            'conta_mestre_seguranca'
        )
    );

    return new;
end;
$function$;

drop trigger if exists
    trg_a3_a12_auditar_rotacao_conta_mestre
on
    public.conta_mestre_seguranca;

create trigger
    trg_a3_a12_auditar_rotacao_conta_mestre
after update of
    rotacao_senha_obrigatoria
on
    public.conta_mestre_seguranca
for each row
execute function
    public.a3_a12_auditar_rotacao_conta_mestre();

-- ============================================================
-- MFA / AAL2
-- ============================================================

create or replace function
    public.registrar_auditoria_mfa_conta_mestre()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_user_id uuid;
    v_email text;
begin
    v_user_id :=
        auth.uid();

    if v_user_id is null then
        raise exception
            'Autenticação obrigatória.';
    end if;

    if not public.a3_a12_usuario_conta_mestre(
        v_user_id
    ) then
        raise exception
            'Operação restrita à Conta Mestre.';
    end if;

    if coalesce(
        auth.jwt() ->> 'aal',
        'aal1'
    ) <> 'aal2' then
        raise exception
            'MASTER_MFA_AAL2_REQUIRED';
    end if;

    select
        nullif(
            lower(
                btrim(
                    coalesce(
                        usuario.email,
                        ''
                    )
                )
            ),
            ''
        )
    into
        v_email
    from
        auth.users as usuario
    where
        usuario.id =
            v_user_id;

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
        v_email,
        'MASTER_MFA_VERIFIED',
        'auth.mfa_factors',
        v_user_id::text,
        'Conta Mestre confirmou MFA em sessão AAL2.',
        jsonb_build_object(
            'aal',
            'aal2'
        )
    );

    return true;
end;
$function$;

revoke all
on function
    public.registrar_auditoria_mfa_conta_mestre()
from public;

revoke all
on function
    public.registrar_auditoria_mfa_conta_mestre()
from anon;

grant execute
on function
    public.registrar_auditoria_mfa_conta_mestre()
to authenticated;

comment on function
    public.registrar_auditoria_mfa_conta_mestre()
is
    'Registra MFA AAL2 da Conta Mestre sem persistir código TOTP, segredo, QR, JWT ou identificador de sessão.';

commit;
