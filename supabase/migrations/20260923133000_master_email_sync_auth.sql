begin;

-- ============================================================
-- F3-A3-A7
-- Conta Mestre: identidade canônica por auth.users.id / user_id.
--
-- Objetivos:
-- 1. Pré-validar novo e-mail antes da solicitação no Supabase Auth.
-- 2. Sincronizar o e-mail interno somente quando auth.users.email
--    realmente mudar após o fluxo seguro de confirmação.
-- 3. Preservar user_id, perfil, acesso global, empresa e histórico.
-- ============================================================

create or replace function public.admin_prevalidar_email_conta_mestre(
    p_novo_email text
)
returns table (
    permitido boolean,
    email_atual text,
    novo_email text,
    motivo text
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_user_id uuid;
    v_email_atual text;
    v_novo_email text;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'Autenticação obrigatória para alterar o e-mail da Conta Mestre.';
    end if;

    if not public.usuario_admin_global() then
        raise exception
            'Operação restrita à Conta Mestre com acesso global.';
    end if;

    select
        lower(
            btrim(
                coalesce(
                    usuario_auth.email,
                    ''
                )
            )
        )
    into
        v_email_atual
    from
        auth.users as usuario_auth
    where
        usuario_auth.id = v_user_id;

    if coalesce(v_email_atual, '') = '' then
        raise exception
            'Não foi possível determinar o e-mail atual da Conta Mestre.';
    end if;

    v_novo_email :=
        lower(
            btrim(
                coalesce(
                    p_novo_email,
                    ''
                )
            )
        );

    if
        v_novo_email = ''
        or v_novo_email !~*
            '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then
        return query
        select
            false,
            v_email_atual,
            v_novo_email,
            'EMAIL_INVALIDO'::text;

        return;
    end if;

    if v_novo_email = v_email_atual then
        return query
        select
            false,
            v_email_atual,
            v_novo_email,
            'EMAIL_SEM_ALTERACAO'::text;

        return;
    end if;

    if exists (
        select
            1
        from
            public.usuarios_permissoes_sistema as permissao
        where
            lower(
                btrim(
                    permissao.email
                )
            ) = v_novo_email
            and (
                permissao.user_id is null
                or permissao.user_id <> v_user_id
            )
    ) then
        return query
        select
            false,
            v_email_atual,
            v_novo_email,
            'EMAIL_JA_VINCULADO_PERMISSOES'::text;

        return;
    end if;

    if exists (
        select
            1
        from
            public.auditoria_usuarios_autorizados as autorizacao
        where
            lower(
                btrim(
                    autorizacao.email
                )
            ) = v_novo_email
            and (
                autorizacao.user_id is null
                or autorizacao.user_id <> v_user_id
            )
    ) then
        return query
        select
            false,
            v_email_atual,
            v_novo_email,
            'EMAIL_JA_VINCULADO_AUDITORIA'::text;

        return;
    end if;

    return query
    select
        true,
        v_email_atual,
        v_novo_email,
        'OK'::text;
end;
$function$;

revoke all
on function public.admin_prevalidar_email_conta_mestre(text)
from public;

revoke all
on function public.admin_prevalidar_email_conta_mestre(text)
from anon;

grant execute
on function public.admin_prevalidar_email_conta_mestre(text)
to authenticated;

-- ============================================================
-- Trigger interno.
--
-- Não recebe e-mail informado pelo cliente.
-- A fonte autoritativa é auth.users.email após confirmação do
-- fluxo nativo "Secure email change".
-- ============================================================

create or replace function public.sincronizar_email_conta_mestre_auth()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_novo_email text;
    v_master_permissoes boolean;
    v_master_auditoria boolean;
begin
    if new.email is not distinct from old.email then
        return new;
    end if;

    v_novo_email :=
        lower(
            btrim(
                coalesce(
                    new.email,
                    ''
                )
            )
        );

    if v_novo_email = '' then
        return new;
    end if;

    select exists (
        select
            1
        from
            public.usuarios_permissoes_sistema as permissao
        where
            permissao.user_id = new.id
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
            and permissao.empresa_id is null
    )
    into
        v_master_permissoes;

    select exists (
        select
            1
        from
            public.auditoria_usuarios_autorizados as autorizacao
        where
            autorizacao.user_id = new.id
            and coalesce(
                autorizacao.ativo,
                false
            ) = true
            and coalesce(
                autorizacao.acesso_global,
                false
            ) = true
            and autorizacao.empresa_id is null
    )
    into
        v_master_auditoria;

    -- Fail closed para contas que não possuem a dupla
    -- caracterização da Conta Mestre.
    if
        not v_master_permissoes
        or not v_master_auditoria
    then
        return new;
    end if;

    if exists (
        select
            1
        from
            public.usuarios_permissoes_sistema as permissao
        where
            lower(
                btrim(
                    permissao.email
                )
            ) = v_novo_email
            and (
                permissao.user_id is null
                or permissao.user_id <> new.id
            )
    ) then
        raise exception
            using
                errcode = '23505',
                message =
                    'MASTER_EMAIL_CONFLICT_USUARIOS_PERMISSOES';
    end if;

    if exists (
        select
            1
        from
            public.auditoria_usuarios_autorizados as autorizacao
        where
            lower(
                btrim(
                    autorizacao.email
                )
            ) = v_novo_email
            and (
                autorizacao.user_id is null
                or autorizacao.user_id <> new.id
            )
    ) then
        raise exception
            using
                errcode = '23505',
                message =
                    'MASTER_EMAIL_CONFLICT_AUDITORIA';
    end if;

    update
        public.usuarios_permissoes_sistema
    set
        email = v_novo_email
    where
        user_id = new.id
        and coalesce(
            ativo,
            false
        ) = true
        and coalesce(
            bloqueado,
            false
        ) = false
        and coalesce(
            excluido,
            false
        ) = false
        and coalesce(
            acesso_global,
            false
        ) = true
        and empresa_id is null;

    update
        public.auditoria_usuarios_autorizados
    set
        email = v_novo_email
    where
        user_id = new.id
        and coalesce(
            ativo,
            false
        ) = true
        and coalesce(
            acesso_global,
            false
        ) = true
        and empresa_id is null;

    return new;
end;
$function$;

revoke all
on function public.sincronizar_email_conta_mestre_auth()
from public;

revoke all
on function public.sincronizar_email_conta_mestre_auth()
from anon;

revoke all
on function public.sincronizar_email_conta_mestre_auth()
from authenticated;

drop trigger if exists
    trg_sincronizar_email_conta_mestre_auth
on
    auth.users;

create trigger
    trg_sincronizar_email_conta_mestre_auth
after update of email
on auth.users
for each row
when (
    old.email is distinct from new.email
)
execute function
    public.sincronizar_email_conta_mestre_auth();

comment on function
    public.admin_prevalidar_email_conta_mestre(text)
is
    'Pré-valida alteração do e-mail da Conta Mestre sem modificar Auth ou tabelas internas.';

comment on function
    public.sincronizar_email_conta_mestre_auth()
is
    'Sincroniza o e-mail confirmado em auth.users com os registros ativos da Conta Mestre pelo user_id imutável.';

commit;