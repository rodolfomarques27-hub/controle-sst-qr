create or replace function public.admin_storage_inventario(
    p_limite integer default 500,
    p_cursor_bucket text default null,
    p_cursor_name text default null,
    p_cursor_id uuid default null
)
returns table (
    id uuid,
    bucket_id text,
    name text,
    bytes bigint,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path to pg_catalog, public
as $function$
declare
    v_limite integer :=
        least(
            greatest(
                coalesce(
                    p_limite,
                    500
                ),
                1
            ),
            1000
        );
begin
    if not coalesce(
        public.usuario_admin_global(),
        false
    ) then
        raise exception
            'Acesso negado: função exclusiva para administradores globais.'
            using errcode = '42501';
    end if;

    if p_cursor_bucket is null then
        if
            p_cursor_name is not null
            or p_cursor_id is not null
        then
            raise exception
                'Cursor inválido: bucket, nome e id devem ser informados em conjunto.'
                using errcode = '22023';
        end if;
    elsif
        p_cursor_name is null
        or p_cursor_id is null
    then
        raise exception
            'Cursor inválido: bucket, nome e id devem ser informados em conjunto.'
            using errcode = '22023';
    end if;

    return query
    select
        o.id,
        o.bucket_id::text,
        o.name::text,
        case
            when
                coalesce(
                    o.metadata ->> 'size',
                    ''
                ) ~ '^[0-9]+$'
            then
                (
                    o.metadata ->> 'size'
                )::bigint
            else
                0::bigint
        end as bytes,
        o.created_at,
        o.updated_at
    from storage.objects as o
    where
        o.archived_at is null
        and coalesce(
            o.is_delete_marker,
            false
        ) = false
        and (
            p_cursor_bucket is null
            or (
                o.bucket_id collate "C" >
                    p_cursor_bucket collate "C"
            )
            or (
                o.bucket_id =
                    p_cursor_bucket
                and o.name collate "C" >
                    p_cursor_name collate "C"
            )
            or (
                o.bucket_id =
                    p_cursor_bucket
                and o.name =
                    p_cursor_name
                and o.id >
                    p_cursor_id
            )
        )
    order by
        o.bucket_id collate "C",
        o.name collate "C",
        o.id
    limit v_limite;
end;
$function$;

revoke all
on function public.admin_storage_inventario(
    integer,
    text,
    text,
    uuid
)
from public;

revoke all
on function public.admin_storage_inventario(
    integer,
    text,
    text,
    uuid
)
from anon;

revoke all
on function public.admin_storage_inventario(
    integer,
    text,
    text,
    uuid
)
from authenticated;

revoke all
on function public.admin_storage_inventario(
    integer,
    text,
    text,
    uuid
)
from service_role;

grant execute
on function public.admin_storage_inventario(
    integer,
    text,
    text,
    uuid
)
to authenticated;

comment on function public.admin_storage_inventario(
    integer,
    text,
    text,
    uuid
)
is
    'Inventário administrativo paginado e somente leitura de metadados de storage.objects. Exclusivo para administradores globais; não altera objetos nem metadados do Storage.';
