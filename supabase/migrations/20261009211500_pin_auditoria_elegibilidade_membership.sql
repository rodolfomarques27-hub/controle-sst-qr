begin;

-- ============================================================================
-- SAFESCAN BRASIL
-- PIN AUDITORIA R2.3
--
-- Objetivo:
-- liberar o PIN pessoal de Auditoria/Vistoria para o modelo atual de acesso,
-- sem exigir cadastro legado em usuarios_permissoes_sistema.
--
-- Elegíveis:
-- 1. administrador ativo do tenant;
-- 2. usuário explicitamente autorizado para Auditoria;
-- 3. usuário global ativo.
--
-- Não altera:
-- - PIN de emergência da empresa;
-- - contato de emergência;
-- - senha/hash empresarial.
-- ============================================================================

do $preflight$
begin
    if to_regclass(
        'public.tenants'
    ) is null then
        raise exception
            'Dependencia ausente: public.tenants';
    end if;

    if to_regclass(
        'public.tenant_memberships'
    ) is null then
        raise exception
            'Dependencia ausente: public.tenant_memberships';
    end if;

    if to_regclass(
        'public.auditoria_usuarios_autorizados'
    ) is null then
        raise exception
            'Dependencia ausente: public.auditoria_usuarios_autorizados';
    end if;

    if to_regclass(
        'public.usuarios_permissoes_sistema'
    ) is null then
        raise exception
            'Dependencia ausente: public.usuarios_permissoes_sistema';
    end if;

    if to_regprocedure(
        'private.emergencia_qr_usuario_elegivel(uuid,uuid)'
    ) is null then
        raise exception
            'Dependencia ausente: private.emergencia_qr_usuario_elegivel';
    end if;
end
$preflight$;

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
            select
                1
            from
                public.tenants tenant
            where
                tenant.id = p_tenant_id

                and tenant.status = 'ativo'
        )

        and (
            -- ---------------------------------------------------------------
            -- Administrador ativo do tenant.
            -- Não depende do cadastro legado de usuarios_permissoes_sistema.
            -- ---------------------------------------------------------------
            exists (
                select
                    1
                from
                    public.tenant_memberships membership
                where
                    membership.tenant_id = p_tenant_id

                    and membership.user_id = p_user_id

                    and membership.status = 'ativo'

                    and lower(
                        pg_catalog.btrim(
                            coalesce(
                                membership.papel,
                                ''
                            )
                        )
                    ) = 'administrador'
            )

            -- ---------------------------------------------------------------
            -- Usuário explicitamente autorizado para Auditoria.
            -- Pode ser global ou vinculado a empresa do mesmo tenant.
            -- ---------------------------------------------------------------
            or exists (
                select
                    1
                from
                    public.auditoria_usuarios_autorizados autorizacao
                where
                    autorizacao.user_id = p_user_id

                    and coalesce(
                        autorizacao.ativo,
                        false
                    ) = true

                    and (
                        coalesce(
                            autorizacao.acesso_global,
                            false
                        ) = true

                        or coalesce(
                            autorizacao.pode_acessar_auditoria,
                            false
                        ) = true

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
                    )

                    and (
                        autorizacao.empresa_id is null

                        or exists (
                            select
                                1
                            from
                                public.empresas empresa
                            where
                                empresa.id =
                                    autorizacao.empresa_id

                                and empresa.tenant_id =
                                    p_tenant_id
                        )
                    )
            )

            -- ---------------------------------------------------------------
            -- Conta global ativa do SafeScan.
            -- Mantém compatibilidade para administração da plataforma.
            -- ---------------------------------------------------------------
            or exists (
                select
                    1
                from
                    public.usuarios_permissoes_sistema usuario
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

                    and coalesce(
                        usuario.acesso_global,
                        false
                    ) = true

                    and usuario.empresa_id is null

                    and lower(
                        pg_catalog.btrim(
                            coalesce(
                                usuario.perfil,
                                ''
                            )
                        )
                    ) <> 'bloqueado'
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

commit;
