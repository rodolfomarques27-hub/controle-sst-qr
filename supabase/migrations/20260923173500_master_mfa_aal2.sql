-- A3-A8 — MFA obrigatório da Conta Mestre.
--
-- Preserva exatamente a semântica remota atual de public.usuario_admin_global()
-- e acrescenta somente a exigência de sessão MFA AAL2.

do $preflight$
begin
    if to_regprocedure(
        'public.usuario_admin_global()'
    ) is null then
        raise exception
            'A3-A8: usuario_admin_global() ausente.';
    end if;

    if to_regclass(
        'public.auditoria_usuarios_autorizados'
    ) is null then
        raise exception
            'A3-A8: auditoria_usuarios_autorizados ausente.';
    end if;

    if to_regclass(
        'public.conta_mestre_seguranca'
    ) is null then
        raise exception
            'A3-A8: conta_mestre_seguranca ausente.';
    end if;
end;
$preflight$;

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

        and coalesce(
            auth.jwt() ->> 'aal',
            'aal1'
        ) = 'aal2'

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