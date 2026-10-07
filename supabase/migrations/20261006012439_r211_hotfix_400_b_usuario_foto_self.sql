create or replace function public.usuario_foto_sistema_atual()
returns text
language plpgsql
security definer
set search_path to pg_catalog, public, auth
as $function$
declare
    v_uid uuid := auth.uid();
    v_email text :=
        lower(
            btrim(
                coalesce(
                    auth.jwt() ->> 'email',
                    ''
                )
            )
        );
    v_foto_url text;
begin
    if
        v_uid is null
        and nullif(v_email, '') is null
    then
        return null;
    end if;

    select
        nullif(
            btrim(
                coalesce(
                    u.foto_url,
                    ''
                )
            ),
            ''
        )
    into v_foto_url
    from public.usuarios_permissoes_sistema as u
    where
        (
            v_uid is not null
            and u.user_id = v_uid
        )
        or
        (
            nullif(v_email, '') is not null
            and lower(
                btrim(
                    coalesce(
                        u.email,
                        ''
                    )
                )
            ) = v_email
        )
    order by
        case
            when
                v_uid is not null
                and u.user_id = v_uid
            then 0
            else 1
        end,
        u.updated_at desc nulls last,
        u.created_at desc nulls last
    limit 1;

    return v_foto_url;
end;
$function$;

revoke all
on function public.usuario_foto_sistema_atual()
from public;

revoke all
on function public.usuario_foto_sistema_atual()
from anon;

grant execute
on function public.usuario_foto_sistema_atual()
to authenticated;