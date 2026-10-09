begin;

do $preflight$
begin
    if to_regprocedure(
        'private.emergencia_qr_usuario_elegivel(uuid,uuid)'
    ) is null then
        raise exception 'Fundacao de PIN individual ausente.';
    end if;

    if to_regprocedure(
        'public.consultar_estado_pin_emergencia_usuario(uuid)'
    ) is not null then
        raise exception 'RPC de prontidao ja existe.';
    end if;
end;
$preflight$;

create function public.consultar_estado_pin_emergencia_usuario(
    p_tenant_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $func$
declare
    v_usuario uuid := auth.uid();
begin
    if v_usuario is null or p_tenant_id is null then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'habilitado', false
        );
    end if;

    if not exists (
        select 1
        from public.tenants t
        where t.id = p_tenant_id
          and t.status = 'ativo'
    ) then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'habilitado', false
        );
    end if;

    if not coalesce(
        private.emergencia_qr_usuario_elegivel(
            p_tenant_id,
            v_usuario
        ),
        false
    ) then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'habilitado', false
        );
    end if;

    return pg_catalog.jsonb_build_object(
        'ok', true,
        'habilitado', true
    );
end;
$func$;

revoke all on function
    public.consultar_estado_pin_emergencia_usuario(uuid)
from public, anon, authenticated;

grant execute on function
    public.consultar_estado_pin_emergencia_usuario(uuid)
to authenticated;

commit;