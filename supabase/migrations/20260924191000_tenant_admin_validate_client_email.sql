-- SafeScan Brasil
-- R3B7-A9.1
-- Validação prévia de disponibilidade do e-mail do Administrador do Cliente.
--
-- Retorna:
-- true  = e-mail livre ou pertencente ao próprio user_id
-- false = e-mail já pertencente a outro usuário Auth
--
-- Segurança:
-- somente Conta Mestre autenticada
-- nenhuma alteração em auth.users
-- nenhuma alteração em membership
-- nenhuma alteração em permissões

create or replace function public.admin_validar_email_cliente_tenant(
    p_user_id uuid,
    p_admin_email text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
    v_actor uuid;
    v_email text;
begin
    v_actor := auth.uid();

    if v_actor is null then
        raise exception
            'Sessão autenticada obrigatória.'
            using errcode = '42501';
    end if;

    if public.usuario_admin_global() is not true then
        raise exception
            'Apenas a Conta Mestre pode validar o e-mail do cliente.'
            using errcode = '42501';
    end if;

    if p_user_id is null then
        raise exception
            'Usuário alvo não informado.'
            using errcode = '22023';
    end if;

    v_email :=
        lower(
            trim(
                coalesce(
                    p_admin_email,
                    ''
                )
            )
        );

    if
        v_email = ''
        or position('@' in v_email) <= 1
    then
        raise exception
            'E-mail inválido.'
            using errcode = '22023';
    end if;

    if not exists (
        select 1
        from auth.users u
        where u.id = p_user_id
    ) then
        raise exception
            'Usuário Auth não localizado.'
            using errcode = '22023';
    end if;

    return not exists (
        select 1
        from auth.users u
        where lower(
            trim(
                coalesce(
                    u.email,
                    ''
                )
            )
        ) = v_email
          and u.id <> p_user_id
    );
end;
$$;

revoke all
    on function public.admin_validar_email_cliente_tenant(
        uuid,
        text
    )
    from public, anon;

grant execute
    on function public.admin_validar_email_cliente_tenant(
        uuid,
        text
    )
    to authenticated;
