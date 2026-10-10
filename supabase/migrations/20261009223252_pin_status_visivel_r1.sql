-- PIN-STATUS-R1
-- Registro local da migration ja aplicada remotamente.
-- Versao remota: 20261009223252
-- NAO reaplicar no Supabase.

create or replace function public.listar_status_pin_emergencia_empresas(
    p_tenant_id uuid
)
returns table (
    empresa_id uuid,
    cadastrado boolean,
    ativo boolean,
    atualizado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
    v_usuario uuid := auth.uid();
begin
    if v_usuario is null then
        raise exception using
            errcode = '42501',
            message = 'Autenticacao obrigatoria.';
    end if;

    if p_tenant_id is null then
        raise exception using
            errcode = '22023',
            message = 'Tenant invalido.';
    end if;

    if not coalesce(
        public.usuario_pode_gerenciar_tenant(p_tenant_id),
        false
    ) then
        raise exception using
            errcode = '42501',
            message = 'Acesso negado para consultar o status dos PINs das empresas.';
    end if;

    return query
    select
        empresa.id,
        segredo.empresa_id is not null,
        coalesce(empresa.emergencia_qr_ativo, false)
            and segredo.empresa_id is not null,
        coalesce(
            segredo.atualizada_em,
            empresa.senha_emergencia_qr_atualizada_em
        )
    from public.empresas empresa
    left join private.emergencia_qr_segredos segredo
        on segredo.empresa_id = empresa.id
    where empresa.tenant_id = p_tenant_id
    order by empresa.id;
end;
$function$;

create or replace function public.consultar_status_meu_pin_acesso(
    p_tenant_id uuid
)
returns table (
    cadastrado boolean,
    ativo boolean,
    atualizado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
    v_usuario uuid := auth.uid();
begin
    if v_usuario is null then
        raise exception using
            errcode = '42501',
            message = 'Autenticacao obrigatoria.';
    end if;

    if p_tenant_id is null then
        raise exception using
            errcode = '22023',
            message = 'Tenant invalido.';
    end if;

    if not coalesce(
        private.emergencia_qr_usuario_elegivel(
            p_tenant_id,
            v_usuario
        ),
        false
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuario nao habilitado para consultar o Meu PIN de acesso neste tenant.';
    end if;

    return query
    select
        pin_usuario.user_id is not null,
        coalesce(pin_usuario.ativo, false),
        pin_usuario.updated_at
    from (select 1) base
    left join private.emergencia_qr_pins_usuarios pin_usuario
        on pin_usuario.tenant_id = p_tenant_id
       and pin_usuario.user_id = v_usuario;
end;
$function$;

revoke all on function
    public.listar_status_pin_emergencia_empresas(uuid)
from public, anon;

revoke all on function
    public.consultar_status_meu_pin_acesso(uuid)
from public, anon;

grant execute on function
    public.listar_status_pin_emergencia_empresas(uuid)
to authenticated, service_role;

grant execute on function
    public.consultar_status_meu_pin_acesso(uuid)
to authenticated, service_role;
