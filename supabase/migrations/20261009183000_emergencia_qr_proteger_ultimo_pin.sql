begin;

do $preflight$
begin
    if to_regclass('private.emergencia_qr_pins_usuarios') is null
       or to_regclass('private.emergencia_qr_modos_empresa') is null
       or to_regprocedure(
           'private.emergencia_qr_usuario_elegivel(uuid,uuid)'
       ) is null
       or to_regprocedure(
           'public.membership_tem_empresa_selecionada(uuid,uuid)'
       ) is null then

        raise exception 'Dependencias de protecao ausentes.';
    end if;
end;
$preflight$;

create function private.emergencia_qr_proteger_ultimo_pin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $func$
declare
    v_empresa record;
begin
    if old.ativo is not true
       or new.ativo is true then
        return new;
    end if;

    for v_empresa in
        select
            e.id,
            e.tenant_id
        from private.emergencia_qr_modos_empresa m
        join public.empresas e
          on e.id = m.empresa_id
        where e.tenant_id = old.tenant_id
          and m.modo = 'individual'
        order by e.id
    loop
        perform pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'emergencia-pin-empresa:' || v_empresa.id::text,
                0
            )
        );

        if not exists (
            select 1
            from private.emergencia_qr_pins_usuarios p
            where p.tenant_id = v_empresa.tenant_id
              and p.user_id <> old.user_id
              and p.ativo is true
              and private.emergencia_qr_usuario_elegivel(
                  p.tenant_id,
                  p.user_id
              )
              and (
                  exists (
                      select 1
                      from public.tenant_memberships tm
                      join public.tenants t
                        on t.id = tm.tenant_id
                      where tm.tenant_id = p.tenant_id
                        and tm.user_id = p.user_id
                        and tm.status = 'ativo'
                        and t.status = 'ativo'
                        and (
                            tm.papel = 'administrador'
                            or tm.escopo_empresas = 'todas'
                            or (
                                tm.escopo_empresas = 'selecionadas'
                                and public.membership_tem_empresa_selecionada(
                                    tm.id,
                                    v_empresa.id
                                )
                            )
                        )
                  )
                  or (
                      not exists (
                          select 1
                          from public.tenant_memberships tm
                          where tm.tenant_id = p.tenant_id
                            and tm.user_id = p.user_id
                      )
                      and exists (
                          select 1
                          from public.usuarios_permissoes_sistema u
                          where u.user_id = p.user_id
                            and u.empresa_id = v_empresa.id
                            and u.ativo is true
                            and coalesce(u.bloqueado, false) = false
                            and coalesce(u.excluido, false) = false
                      )
                  )
              )
        ) then
            raise exception
                'Nao e permitido desativar o ultimo PIN autorizado da empresa em modo individual.'
                using errcode = '23514';
        end if;
    end loop;

    return new;
end;
$func$;

revoke all on function
    private.emergencia_qr_proteger_ultimo_pin()
from public, anon, authenticated;

create trigger emergencia_qr_proteger_ultimo_pin_trg
before update of ativo
on private.emergencia_qr_pins_usuarios
for each row
execute function private.emergencia_qr_proteger_ultimo_pin();

commit;