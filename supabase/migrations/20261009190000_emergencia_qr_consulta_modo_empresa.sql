begin;

do $preflight$
begin
    if to_regclass('private.emergencia_qr_modos_empresa') is null
       or to_regprocedure(
           'public.usuario_pode_gerenciar_tenant(uuid)'
       ) is null then
        raise exception 'Dependencias da consulta ausentes.';
    end if;

    if to_regprocedure(
        'public.consultar_modo_emergencia_qr_empresa(uuid)'
    ) is not null then
        raise exception 'RPC de consulta ja existente.';
    end if;
end;
$preflight$;

create function public.consultar_modo_emergencia_qr_empresa(
    p_empresa_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $func$
declare
    v_tenant_id uuid;
    v_modo text;
    v_emergencia_ativa boolean;
begin
    if auth.uid() is null or p_empresa_id is null then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'mensagem', 'Acesso nao autorizado.'
        );
    end if;

    select
        e.tenant_id,
        coalesce(m.modo, 'empresa'),
        coalesce(e.emergencia_qr_ativo, false)
    into
        v_tenant_id,
        v_modo,
        v_emergencia_ativa
    from public.empresas e
    left join private.emergencia_qr_modos_empresa m
      on m.empresa_id = e.id
    where e.id = p_empresa_id;

    if v_tenant_id is null
       or not coalesce(
           public.usuario_pode_gerenciar_tenant(v_tenant_id),
           false
       ) then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'mensagem', 'Permissao insuficiente.'
        );
    end if;

    return pg_catalog.jsonb_build_object(
        'ok', true,
        'empresaId', p_empresa_id,
        'modo', v_modo,
        'emergenciaAtiva', v_emergencia_ativa
    );
end;
$func$;

revoke all on function
    public.consultar_modo_emergencia_qr_empresa(uuid)
from public, anon, authenticated;

grant execute on function
    public.consultar_modo_emergencia_qr_empresa(uuid)
to authenticated;

commit;