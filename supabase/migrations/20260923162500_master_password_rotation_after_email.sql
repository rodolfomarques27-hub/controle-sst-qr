begin;

-- ============================================================
-- F3-A3-A7-R7
-- Conta Mestre: rotação obrigatória de senha após alteração
-- confirmada do e-mail administrativo.
--
-- Regras:
-- 1. Nenhuma senha é armazenada nesta estrutura.
-- 2. A identidade permanece vinculada ao auth.users.id.
-- 3. Uma troca efetiva de auth.users.email da Conta Mestre
--    marca rotação obrigatória.
-- 4. Uma mudança efetiva de encrypted_password registra que a
--    senha foi rotacionada, mas não libera o Painel Mestre.
-- 5. A conclusão exige novo login autenticado depois da
--    rotação efetiva da senha.
-- 6. O frontend consulta o estado somente por RPC autenticada.
-- ============================================================

create table if not exists public.conta_mestre_seguranca (
    user_id uuid primary key
        references auth.users(id)
        on delete cascade,

    rotacao_senha_obrigatoria boolean
        not null
        default false,

    motivo_rotacao text null,

    email_referencia text null,

    marcada_em timestamptz null,

    senha_rotacionada_em timestamptz null,

    concluida_em timestamptz null,

    atualizado_em timestamptz
        not null
        default now(),

    constraint conta_mestre_seguranca_motivo_check
        check (
            motivo_rotacao is null
            or motivo_rotacao in (
                'ALTERACAO_EMAIL'
            )
        )
);

alter table
    public.conta_mestre_seguranca
enable row level security;

revoke all
on table public.conta_mestre_seguranca
from public;

revoke all
on table public.conta_mestre_seguranca
from anon;

revoke all
on table public.conta_mestre_seguranca
from authenticated;

-- ============================================================
-- Identidade canônica da Conta Mestre.
--
-- Esta função responde somente QUEM é a Conta Mestre.
-- Ela não considera o gate temporário de rotação de senha.
--
-- Isso permite que as RPCs estritamente necessárias ao fluxo
-- de segurança continuem reconhecendo a identidade enquanto
-- as demais operações administrativas permanecem bloqueadas.
-- ============================================================

create or replace function
    public.usuario_conta_mestre_identidade()
returns boolean
language sql
security definer
set search_path = pg_catalog, public, auth
as $function$
    select
        auth.uid() is not null

        and exists (
            select
                1
            from
                public.usuarios_permissoes_sistema
                    as permissao
            where
                permissao.user_id =
                    auth.uid()

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
                    auth.uid()

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
    public.usuario_conta_mestre_identidade()
from public;

revoke all
on function
    public.usuario_conta_mestre_identidade()
from anon;

grant execute
on function
    public.usuario_conta_mestre_identidade()
to authenticated;

comment on function
    public.usuario_conta_mestre_identidade()
is
    'Reconhece a identidade canônica da Conta Mestre sem liberar operações administrativas durante uma rotação de credencial.';

-- ============================================================
-- Gate global de autorização.
--
-- Preserva a semântica administrativa já existente, porém
-- nega o privilégio enquanto houver uma rotação obrigatória
-- pendente para o usuário autenticado.
--
-- A assinatura permanece usuario_admin_global(), portanto
-- RPCs e policies existentes continuam apontando para o mesmo
-- ponto central de autorização.
-- ============================================================

create or replace function
    public.usuario_admin_global()
returns boolean
language sql
security definer
set search_path = pg_catalog, public, auth
as $function$
    select
        exists (
            select
                1
            from
                public.auditoria_usuarios_autorizados
                    as autorizacao
            where
                autorizacao.user_id =
                    auth.uid()

                and coalesce(
                    autorizacao.ativo,
                    false
                ) = true

                and (
                    coalesce(
                        autorizacao.acesso_global,
                        false
                    ) = true

                    or lower(
                        coalesce(
                            autorizacao.perfil,
                            ''
                        )
                    ) in (
                        'admin',
                        'administrador'
                    )
                )
        )

        and not exists (
            select
                1
            from
                public.conta_mestre_seguranca
                    as seguranca
            where
                seguranca.user_id =
                    auth.uid()

                and coalesce(
                    seguranca.rotacao_senha_obrigatoria,
                    false
                ) = true
        );
$function$;

comment on function
    public.usuario_admin_global()
is
    'Autoriza operações administrativas globais e bloqueia essas operações enquanto existir rotação obrigatória de senha pendente.';

-- ============================================================
-- Trigger: após mudança confirmada de e-mail.
--
-- O trigger não confia no e-mail informado pelo cliente.
-- A fonte autoritativa é auth.users.email depois que o
-- Secure Email Change do Supabase foi concluído.
-- ============================================================

create or replace function
    public.marcar_rotacao_senha_conta_mestre_auth()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_master_permissoes boolean;
    v_master_auditoria boolean;
    v_email text;
begin
    if new.email is not distinct from old.email then
        return new;
    end if;

    v_email :=
        lower(
            btrim(
                coalesce(
                    new.email,
                    ''
                )
            )
        );

    if v_email = '' then
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

    if
        not v_master_permissoes
        or not v_master_auditoria
    then
        return new;
    end if;

    insert into
        public.conta_mestre_seguranca (
            user_id,
            rotacao_senha_obrigatoria,
            motivo_rotacao,
            email_referencia,
            marcada_em,
            senha_rotacionada_em,
            concluida_em,
            atualizado_em
        )
    values (
        new.id,
        true,
        'ALTERACAO_EMAIL',
        v_email,
        now(),
        null,
        null,
        now()
    )
    on conflict (
        user_id
    )
    do update
    set
        rotacao_senha_obrigatoria =
            true,
        motivo_rotacao =
            'ALTERACAO_EMAIL',
        email_referencia =
            excluded.email_referencia,
        marcada_em =
            now(),
        senha_rotacionada_em =
            null,
        concluida_em =
            null,
        atualizado_em =
            now();

    return new;
end;
$function$;

revoke all
on function
    public.marcar_rotacao_senha_conta_mestre_auth()
from public;

revoke all
on function
    public.marcar_rotacao_senha_conta_mestre_auth()
from anon;

revoke all
on function
    public.marcar_rotacao_senha_conta_mestre_auth()
from authenticated;

drop trigger if exists
    trg_marcar_rotacao_senha_conta_mestre_auth
on
    auth.users;

create trigger
    trg_marcar_rotacao_senha_conta_mestre_auth
after update of email
on auth.users
for each row
when (
    old.email is distinct from new.email
)
execute function
    public.marcar_rotacao_senha_conta_mestre_auth();

-- ============================================================
-- Trigger: uma senha realmente alterada registra a rotação.
--
-- Nenhum hash é copiado ou armazenado fora de auth.users.
-- Apenas registramos que o valor autoritativo mudou.
-- A obrigação permanece ativa até a conclusão explícita.
-- ============================================================

create or replace function
    public.registrar_rotacao_senha_conta_mestre_auth()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
    if
        new.encrypted_password
        is not distinct from
        old.encrypted_password
    then
        return new;
    end if;

    update
        public.conta_mestre_seguranca
    set
        senha_rotacionada_em =
            now(),
        atualizado_em =
            now()
    where
        user_id = new.id
        and rotacao_senha_obrigatoria =
            true;

    return new;
end;
$function$;

revoke all
on function
    public.registrar_rotacao_senha_conta_mestre_auth()
from public;

revoke all
on function
    public.registrar_rotacao_senha_conta_mestre_auth()
from anon;

revoke all
on function
    public.registrar_rotacao_senha_conta_mestre_auth()
from authenticated;

drop trigger if exists
    trg_registrar_rotacao_senha_conta_mestre_auth
on
    auth.users;

create trigger
    trg_registrar_rotacao_senha_conta_mestre_auth
after update of encrypted_password
on auth.users
for each row
when (
    old.encrypted_password
    is distinct from
    new.encrypted_password
)
execute function
    public.registrar_rotacao_senha_conta_mestre_auth();

-- ============================================================
-- RPC somente leitura para o AuthGate.
-- ============================================================

create or replace function
    public.admin_status_rotacao_senha_conta_mestre()
returns table (
    rotacao_senha_obrigatoria boolean,
    motivo_rotacao text,
    email_referencia text,
    marcada_em timestamptz,
    senha_rotacionada_em timestamptz,
    concluida_em timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_user_id uuid;
begin
    v_user_id :=
        auth.uid();

    if v_user_id is null then
        raise exception
            'Autenticação obrigatória para consultar o estado de segurança da Conta Mestre.';
    end if;

    if not public.usuario_conta_mestre_identidade() then
        raise exception
            'Operação restrita à Conta Mestre com acesso global.';
    end if;

    return query
    select
        coalesce(
            seguranca.rotacao_senha_obrigatoria,
            false
        ),
        seguranca.motivo_rotacao,
        seguranca.email_referencia,
        seguranca.marcada_em,
        seguranca.senha_rotacionada_em,
        seguranca.concluida_em
    from
        (
            select
                1
        ) as base
    left join
        public.conta_mestre_seguranca
            as seguranca
        on
            seguranca.user_id =
                v_user_id;
end;
$function$;

revoke all
on function
    public.admin_status_rotacao_senha_conta_mestre()
from public;

revoke all
on function
    public.admin_status_rotacao_senha_conta_mestre()
from anon;

grant execute
on function
    public.admin_status_rotacao_senha_conta_mestre()
to authenticated;


-- ============================================================
-- RPC de conclusão.
--
-- Só permite liberar o Painel Mestre quando:
-- 1. existe rotação obrigatória pendente;
-- 2. auth.users registrou mudança efetiva da senha;
-- 3. ocorreu um novo login depois da rotação da senha.
--
-- A prova server-side do novo login usa auth.users.last_sign_in_at.
-- Sessões anteriores à rotação não conseguem concluir o gate.
-- ============================================================

create or replace function
    public.admin_concluir_rotacao_senha_conta_mestre()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_user_id uuid;
    v_atualizados integer;
begin
    v_user_id :=
        auth.uid();

    if v_user_id is null then
        raise exception
            'Autenticação obrigatória para concluir a rotação de senha da Conta Mestre.';
    end if;

    if not public.usuario_conta_mestre_identidade() then
        raise exception
            'Operação restrita à Conta Mestre com acesso global.';
    end if;

    update
        public.conta_mestre_seguranca
            as seguranca
    set
        rotacao_senha_obrigatoria =
            false,
        concluida_em =
            now(),
        atualizado_em =
            now()
    where
        seguranca.user_id =
            v_user_id
        and seguranca.rotacao_senha_obrigatoria =
            true
        and seguranca.senha_rotacionada_em
            is not null
        and exists (
            select
                1
            from
                auth.users
                    as auth_user
            where
                auth_user.id =
                    v_user_id
                and auth_user.last_sign_in_at
                    is not null
                and auth_user.last_sign_in_at >
                    seguranca.senha_rotacionada_em
        );

    get diagnostics
        v_atualizados =
            row_count;

    if v_atualizados <> 1 then
        raise exception
            'MASTER_NEW_LOGIN_REQUIRED';
    end if;

    return true;
end;
$function$;

revoke all
on function
    public.admin_concluir_rotacao_senha_conta_mestre()
from public;

revoke all
on function
    public.admin_concluir_rotacao_senha_conta_mestre()
from anon;

grant execute
on function
    public.admin_concluir_rotacao_senha_conta_mestre()
to authenticated;
comment on table
    public.conta_mestre_seguranca
is
    'Estado server-side da proteção adicional da Conta Mestre. Não armazena senhas.';

comment on function
    public.marcar_rotacao_senha_conta_mestre_auth()
is
    'Marca rotação obrigatória de senha após alteração confirmada do e-mail da Conta Mestre.';

comment on function
    public.registrar_rotacao_senha_conta_mestre_auth()
is
    'Registra que auth.users recebeu uma nova senha durante uma rotação obrigatória pendente.';

comment on function
    public.admin_status_rotacao_senha_conta_mestre()
is
    'Retorna ao administrador global autenticado o estado da rotação obrigatória de senha.';

comment on function
    public.admin_concluir_rotacao_senha_conta_mestre()
is
    'Conclui a rotação obrigatória somente após mudança efetiva da senha e novo login da Conta Mestre.';

commit;