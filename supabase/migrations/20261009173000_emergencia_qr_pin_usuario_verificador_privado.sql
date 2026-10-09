begin;

do $preflight$
begin
    if to_regclass('private.emergencia_qr_pins_usuarios') is null
       or to_regprocedure(
           'private.emergencia_qr_usuario_elegivel(uuid,uuid)'
       ) is null
       or to_regprocedure(
           'public.membership_tem_empresa_selecionada(uuid,uuid)'
       ) is null then
        raise exception 'Dependencias do PIN individual ausentes.';
    end if;

    if to_regprocedure(
        'private.emergencia_qr_pin_usuario_valido(uuid,uuid,text,text)'
    ) is not null then
        raise exception 'Verificador privado ja existe.';
    end if;
end;
$preflight$;

create function private.emergencia_qr_usuario_autorizado_empresa(
    p_tenant_id uuid,
    p_empresa_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $eligibility$
    select
        p_user_id is not null
        and private.emergencia_qr_usuario_elegivel(p_tenant_id, p_user_id)
        and exists (
            select 1
            from public.empresas e
            join public.tenants t
              on t.id = e.tenant_id
            where e.id = p_empresa_id
              and e.tenant_id = p_tenant_id
              and t.status = 'ativo'
        )
        and (
            exists (
                select 1
                from public.tenant_memberships tm
                where tm.tenant_id = p_tenant_id
                  and tm.user_id = p_user_id
                  and tm.status = 'ativo'
                  and (
                      tm.papel = 'administrador'
                      or tm.escopo_empresas = 'todas'
                      or (
                          tm.escopo_empresas = 'selecionadas'
                          and public.membership_tem_empresa_selecionada(
                              tm.id, p_empresa_id
                          )
                      )
                  )
            )
            or (
                not exists (
                    select 1
                    from public.tenant_memberships tm
                    where tm.tenant_id = p_tenant_id
                      and tm.user_id = p_user_id
                )
                and exists (
                    select 1
                    from public.usuarios_permissoes_sistema u
                    where u.user_id = p_user_id
                      and u.empresa_id = p_empresa_id
                      and u.ativo is true
                      and coalesce(u.bloqueado, false) = false
                      and coalesce(u.excluido, false) = false
                )
            )
        );
$eligibility$;

revoke all on function
    private.emergencia_qr_usuario_autorizado_empresa(uuid,uuid,uuid)
from public, anon, authenticated;

create function private.emergencia_qr_pin_usuario_valido(
    p_tenant_id uuid,
    p_empresa_id uuid,
    p_email text,
    p_pin text
)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog
as $func$
declare
    v_pin text;
    v_email text := pg_catalog.lower(
        pg_catalog.btrim(coalesce(p_email, ''))
    );
    v_usuario uuid;
begin
    if p_tenant_id is null or p_empresa_id is null then
        return null;
    end if;

    v_pin := pg_catalog.btrim(coalesce(p_pin, ''));

    if v_pin !~ '^[0-9]{6,10}$'
       or pg_catalog.length(v_email) > 254
       or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
        return null;
    end if;

    select p.user_id
      into v_usuario
      from private.emergencia_qr_pins_usuarios p
      join auth.users a
        on a.id = p.user_id
     where p.tenant_id = p_tenant_id
       and p.ativo is true
       and pg_catalog.lower(pg_catalog.btrim(a.email)) = v_email
       and private.emergencia_qr_usuario_autorizado_empresa(
           p_tenant_id,
           p_empresa_id,
           p.user_id
       )
       and p.senha_hash = extensions.crypt(
           v_pin,
           p.senha_hash
       )
     limit 1;

    return v_usuario;
end;
$func$;

revoke all on function
    private.emergencia_qr_pin_usuario_valido(uuid,uuid,text,text)
from public, anon, authenticated;

commit;