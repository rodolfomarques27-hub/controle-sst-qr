begin;

-- ============================================================================
-- SAFESCAN BRASIL
-- P2-A — Auditoria pública — hardening server-side — Fase 1
--
-- Nova assinatura segura:
-- salvar_auditoria_campo_publica(token, senha, payload)
--
-- A assinatura antiga de 2 argumentos permanece temporariamente disponível
-- nesta fase para evitar indisponibilidade da versão ainda publicada.
-- ============================================================================

create or replace function public.validar_acesso_auditoria_publica(
    p_token text,
    p_senha text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
    v_token record;
    v_token_informado text;
    v_senha_informada text;
begin
    v_token_informado :=
        btrim(
            coalesce(
                p_token,
                ''
            )
        );

    v_senha_informada :=
        btrim(
            coalesce(
                p_senha,
                ''
            )
        );

    if v_token_informado = '' then
        return jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'Token público da auditoria não informado.'
        );
    end if;

    select
        token_registro.id,
        token_registro.token,
        token_registro.ativo,
        token_registro.requer_senha,
        token_registro.data_expiracao,
        token_registro.senha_acesso
    into
        v_token
    from
        public.auditoria_tokens_publicos token_registro
    where
        btrim(token_registro.token) = v_token_informado
        and token_registro.ativo is true
        and (
            token_registro.data_expiracao is null
            or token_registro.data_expiracao > now()
        )
    order by
        token_registro.created_at desc
    limit 1;

    if not found then
        return jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'Token público da auditoria inválido, inativo ou expirado.'
        );
    end if;

    if coalesce(
        v_token.requer_senha,
        true
    ) is true then

        if nullif(
            btrim(
                coalesce(
                    v_token.senha_acesso,
                    ''
                )
            ),
            ''
        ) is null then
            return jsonb_build_object(
                'ok', false,
                'autorizado', false,
                'mensagem', 'Senha da auditoria ainda não configurada.'
            );
        end if;

        if btrim(
            coalesce(
                v_token.senha_acesso,
                ''
            )
        ) <> v_senha_informada then
            return jsonb_build_object(
                'ok', false,
                'autorizado', false,
                'mensagem', 'Senha da auditoria inválida.'
            );
        end if;
    end if;

    return jsonb_build_object(
        'ok', true,
        'autorizado', true,
        'mensagem', 'Acesso autorizado.',
        'token_id', v_token.id
    );
end;
$function$;

revoke all
on function public.validar_acesso_auditoria_publica(text, text)
from public;

grant execute
on function public.validar_acesso_auditoria_publica(text, text)
to anon, authenticated, service_role;


create or replace function public.salvar_auditoria_campo_publica(
    p_token text,
    p_senha text,
    p_dados jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
    v_validacao jsonb;
    v_autorizado boolean;
    v_mensagem text;
begin
    if auth.uid() is not null
       and coalesce(
            public.usuario_pode_acessar_auditoria(),
            false
       ) is true then

        return public.salvar_auditoria_campo_publica(
            p_token,
            p_dados
        );
    end if;

    v_validacao :=
        public.validar_acesso_auditoria_publica(
            p_token,
            p_senha
        );

    v_autorizado :=
        coalesce(
            (
                v_validacao ->> 'autorizado'
            )::boolean,
            false
        );

    if v_autorizado is not true then

        v_mensagem :=
            coalesce(
                nullif(
                    v_validacao ->> 'mensagem',
                    ''
                ),
                'Acesso público da auditoria não autorizado.'
            );

        raise exception
            using
                errcode = '42501',
                message = v_mensagem;
    end if;

    return public.salvar_auditoria_campo_publica(
        p_token,
        p_dados
    );
end;
$function$;

revoke all
on function public.salvar_auditoria_campo_publica(text, text, jsonb)
from public;

grant execute
on function public.salvar_auditoria_campo_publica(text, text, jsonb)
to anon, authenticated, service_role;

comment on function public.salvar_auditoria_campo_publica(text, text, jsonb)
is
'P2-A Fase 1: salvamento público protegido por validação server-side de token e senha. Assinatura legada preservada temporariamente durante a transição.';

commit;
