-- R2.12
-- Fundação estrutural do PIN individual do contato de emergência QR.
--
-- IMPORTANTE:
-- 1. Esta migration NÃO altera o fluxo legado existente.
-- 2. A ausência de registro em private.emergencia_qr_config_tenants
--    representa semanticamente o modo legado.
-- 3. Nenhum PIN legado é copiado.
-- 4. Nenhum tenant é ativado no modo individual por esta migration.
-- 5. Nenhuma RPC pública existente é alterada nesta etapa.

create table private.emergencia_qr_config_tenants (
    tenant_id uuid not null,
    modo text not null default 'legado',
    created_at timestamptz not null default pg_catalog.now(),
    updated_at timestamptz not null default pg_catalog.now(),
    updated_by uuid null,

    constraint emergencia_qr_config_tenants_pkey
        primary key (tenant_id),

    constraint emergencia_qr_config_tenants_tenant_id_fkey
        foreign key (tenant_id)
        references public.tenants(id)
        on delete cascade,

    constraint emergencia_qr_config_tenants_updated_by_fkey
        foreign key (updated_by)
        references auth.users(id)
        on delete set null,

    constraint emergencia_qr_config_tenants_modo_check
        check (
            modo = any (
                array[
                    'legado'::text,
                    'individual'::text
                ]
            )
        ),

    constraint emergencia_qr_config_tenants_timestamps_check
        check (
            updated_at >= created_at
        )
);

alter table private.emergencia_qr_config_tenants
    enable row level security;

revoke all
on table private.emergencia_qr_config_tenants
from public;

revoke all
on table private.emergencia_qr_config_tenants
from anon;

revoke all
on table private.emergencia_qr_config_tenants
from authenticated;


create table private.emergencia_qr_pins_usuarios (
    tenant_id uuid not null,
    user_id uuid not null,
    senha_hash text not null,
    ativo boolean not null default true,
    created_at timestamptz not null default pg_catalog.now(),
    updated_at timestamptz not null default pg_catalog.now(),
    created_by uuid null,
    updated_by uuid null,

    constraint emergencia_qr_pins_usuarios_pkey
        primary key (
            tenant_id,
            user_id
        ),

    constraint emergencia_qr_pins_usuarios_tenant_id_fkey
        foreign key (tenant_id)
        references public.tenants(id)
        on delete cascade,

    constraint emergencia_qr_pins_usuarios_user_id_fkey
        foreign key (user_id)
        references auth.users(id)
        on delete cascade,

    constraint emergencia_qr_pins_usuarios_created_by_fkey
        foreign key (created_by)
        references auth.users(id)
        on delete set null,

    constraint emergencia_qr_pins_usuarios_updated_by_fkey
        foreign key (updated_by)
        references auth.users(id)
        on delete set null,

    constraint emergencia_qr_pins_usuarios_senha_hash_check
        check (
            pg_catalog.btrim(senha_hash) <> ''
        ),

    constraint emergencia_qr_pins_usuarios_timestamps_check
        check (
            updated_at >= created_at
        )
);

create index emergencia_qr_pins_usuarios_user_id_idx
    on private.emergencia_qr_pins_usuarios (
        user_id
    );

alter table private.emergencia_qr_pins_usuarios
    enable row level security;

revoke all
on table private.emergencia_qr_pins_usuarios
from public;

revoke all
on table private.emergencia_qr_pins_usuarios
from anon;

revoke all
on table private.emergencia_qr_pins_usuarios
from authenticated;


create function private.emergencia_qr_usuario_elegivel(
    p_tenant_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
    select
        p_tenant_id is not null

        and p_user_id is not null

        and exists (
            select
                1
            from
                public.usuarios_permissoes_sistema
                    as usuario
            where
                usuario.user_id = p_user_id

                and coalesce(
                    usuario.ativo,
                    false
                ) = true

                and coalesce(
                    usuario.bloqueado,
                    false
                ) = false

                and coalesce(
                    usuario.excluido,
                    false
                ) = false

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
            (
                exists (
                    select
                        1
                    from
                        public.usuarios_permissoes_sistema
                            as global_usuario
                    where
                        global_usuario.user_id =
                            p_user_id

                        and coalesce(
                            global_usuario.ativo,
                            false
                        ) = true

                        and coalesce(
                            global_usuario.bloqueado,
                            false
                        ) = false

                        and coalesce(
                            global_usuario.excluido,
                            false
                        ) = false

                        and coalesce(
                            global_usuario.acesso_global,
                            false
                        ) = true

                        and global_usuario.empresa_id
                            is null

                        and lower(
                            pg_catalog.btrim(
                                coalesce(
                                    global_usuario.perfil,
                                    ''
                                )
                            )
                        ) <> 'bloqueado'
                )

                and exists (
                    select
                        1
                    from
                        public.auditoria_usuarios_autorizados
                            as autorizacao_global
                    where
                        autorizacao_global.user_id =
                            p_user_id

                        and coalesce(
                            autorizacao_global.ativo,
                            false
                        ) = true

                        and autorizacao_global.empresa_id
                            is null

                        and (
                            coalesce(
                                autorizacao_global.acesso_global,
                                false
                            ) = true

                            or lower(
                                pg_catalog.btrim(
                                    coalesce(
                                        autorizacao_global.perfil,
                                        ''
                                    )
                                )
                            ) in (
                                'admin',
                                'administrador'
                            )
                        )
                )
            )

            or exists (
                select
                    1
                from
                    public.tenant_memberships
                        as membership

                    join public.tenants
                        as tenant
                      on tenant.id =
                            membership.tenant_id
                where
                    membership.tenant_id =
                        p_tenant_id

                    and membership.user_id =
                        p_user_id

                    and membership.status =
                        'ativo'

                    and tenant.status =
                        'ativo'
            )
        );
$function$;

revoke all
on function private.emergencia_qr_usuario_elegivel(
    uuid,
    uuid
)
from public;

revoke all
on function private.emergencia_qr_usuario_elegivel(
    uuid,
    uuid
)
from anon;

revoke all
on function private.emergencia_qr_usuario_elegivel(
    uuid,
    uuid
)
from authenticated;