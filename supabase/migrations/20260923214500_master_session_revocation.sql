-- ============================================================
-- A3-A9 — revogação controlada de sessões da Conta Mestre.
--
-- Preserva:
-- - autorização existente em auditoria_usuarios_autorizados;
-- - bloqueio por rotacao_senha_obrigatoria;
-- - MFA/AAL2 da etapa A3-A8.
--
-- Acrescenta:
-- - cutoff temporal para JWTs administrativos antigos;
-- - exceção opcional para a sessão atual preservada.
-- ============================================================

do $preflight$
begin
    if to_regprocedure(
        'public.usuario_admin_global()'
    ) is null then
        raise exception
            'A3-A9: usuario_admin_global() ausente.';
    end if;

    if to_regclass(
        'public.conta_mestre_seguranca'
    ) is null then
        raise exception
            'A3-A9: conta_mestre_seguranca ausente.';
    end if;
end;
$preflight$;

alter table
    public.conta_mestre_seguranca
add column if not exists
    sessoes_revogadas_em
        timestamptz;

alter table
    public.conta_mestre_seguranca
add column if not exists
    sessao_preservada_id
        text;

comment on column
    public.conta_mestre_seguranca.sessoes_revogadas_em
is
    'Cutoff de segurança para invalidar privilégios administrativos de JWTs emitidos antes da revogação de sessões.';

comment on column
    public.conta_mestre_seguranca.sessao_preservada_id
is
    'session_id que pode permanecer válido quando a revogação usa scope others; nulo em revogação global.';

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
        )

        and not exists (
            select
                1
            from
                public.conta_mestre_seguranca
                    as seguranca_sessao
            where
                seguranca_sessao.user_id =
                    auth.uid()

                and seguranca_sessao.sessoes_revogadas_em
                    is not null

                and coalesce(
                    (
                        auth.jwt() ->> 'iat'
                    )::bigint,
                    0
                ) <=
                    floor(
                        extract(
                            epoch
                            from
                                seguranca_sessao.sessoes_revogadas_em
                        )
                    )::bigint

                and (
                    seguranca_sessao.sessao_preservada_id
                        is null

                    or coalesce(
                        auth.jwt() ->> 'session_id',
                        ''
                    ) <>
                        seguranca_sessao.sessao_preservada_id
                )
        );
$function$;
