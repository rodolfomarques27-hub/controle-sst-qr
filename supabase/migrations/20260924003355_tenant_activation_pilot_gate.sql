begin;

create table public.tenant_activation_pilot_authorizations (
    tenant_id uuid primary key
        references public.tenants(id)
        on delete cascade,

    habilitada boolean not null
        default false,

    habilitada_por uuid null
        references auth.users(id)
        on delete set null,

    habilitada_em timestamptz null,

    revogada_por uuid null
        references auth.users(id)
        on delete set null,

    revogada_em timestamptz null,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    constraint tenant_activation_pilot_authorizations_enabled_check
        check (
            habilitada = false
            or (
                habilitada_por is not null
                and habilitada_em is not null
                and revogada_por is null
                and revogada_em is null
            )
        )
);

alter table public.tenant_activation_pilot_authorizations
    enable row level security;

revoke all
on table public.tenant_activation_pilot_authorizations
from public;

revoke all
on table public.tenant_activation_pilot_authorizations
from anon;

revoke all
on table public.tenant_activation_pilot_authorizations
from authenticated;

grant select, insert, update, delete
on table public.tenant_activation_pilot_authorizations
to service_role;

create or replace function
    public.admin_obter_liberacao_ativacao_tenant(
        p_tenant_id uuid
    )
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_row public.tenant_activation_pilot_authorizations%rowtype;
begin
    if auth.uid() is null
       or not public.usuario_admin_global() then
        raise exception using
            errcode = '42501',
            message = 'Consulta da liberação piloto restrita ao administrador global SafeScan.';
    end if;

    if p_tenant_id is null then
        raise exception 'tenant_id é obrigatório.';
    end if;

    if not exists (
        select 1
        from public.tenants t
        where t.id = p_tenant_id
    ) then
        raise exception 'Tenant não localizado.';
    end if;

    select *
    into v_row
    from public.tenant_activation_pilot_authorizations a
    where a.tenant_id = p_tenant_id;

    if not found then
        return jsonb_build_object(
            'tenantId', p_tenant_id,
            'habilitada', false,
            'habilitadaPor', null,
            'habilitadaEm', null,
            'revogadaPor', null,
            'revogadaEm', null,
            'updatedAt', null
        );
    end if;

    return jsonb_build_object(
        'tenantId', v_row.tenant_id,
        'habilitada', v_row.habilitada,
        'habilitadaPor', v_row.habilitada_por,
        'habilitadaEm', v_row.habilitada_em,
        'revogadaPor', v_row.revogada_por,
        'revogadaEm', v_row.revogada_em,
        'updatedAt', v_row.updated_at
    );
end;
$function$;

revoke all
on function public.admin_obter_liberacao_ativacao_tenant(uuid)
from public;

revoke all
on function public.admin_obter_liberacao_ativacao_tenant(uuid)
from anon;

grant execute
on function public.admin_obter_liberacao_ativacao_tenant(uuid)
to authenticated;

create or replace function
    public.admin_definir_liberacao_ativacao_tenant(
        p_tenant_id uuid,
        p_habilitada boolean
    )
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_executor uuid;
    v_email text;
    v_status text;
    v_anterior boolean := false;
    v_existia boolean := false;
    v_agora timestamptz := clock_timestamp();
begin
    v_executor := auth.uid();

    if v_executor is null
       or not public.usuario_admin_global() then
        raise exception using
            errcode = '42501',
            message = 'Liberação piloto restrita ao administrador global SafeScan.';
    end if;

    if p_tenant_id is null then
        raise exception 'tenant_id é obrigatório.';
    end if;

    if p_habilitada is null then
        raise exception 'Estado da liberação piloto é obrigatório.';
    end if;

    select t.status
    into v_status
    from public.tenants t
    where t.id = p_tenant_id
    for update;

    if not found then
        raise exception 'Tenant não localizado.';
    end if;

    if v_status not in ('rascunho', 'ativo') then
        raise exception
            'Tenant em status % não pode receber liberação piloto.',
            v_status;
    end if;

    select
        true,
        a.habilitada
    into
        v_existia,
        v_anterior
    from public.tenant_activation_pilot_authorizations a
    where a.tenant_id = p_tenant_id
    for update;

    if not found then
        v_existia := false;
        v_anterior := false;
    end if;

    if v_existia
       and v_anterior = p_habilitada then
        return public.admin_obter_liberacao_ativacao_tenant(
            p_tenant_id
        ) || jsonb_build_object(
            'alterado',
            false
        );
    end if;

    if p_habilitada then
        insert into public.tenant_activation_pilot_authorizations (
            tenant_id,
            habilitada,
            habilitada_por,
            habilitada_em,
            revogada_por,
            revogada_em,
            created_at,
            updated_at
        )
        values (
            p_tenant_id,
            true,
            v_executor,
            v_agora,
            null,
            null,
            v_agora,
            v_agora
        )
        on conflict (tenant_id)
        do update set
            habilitada = true,
            habilitada_por = excluded.habilitada_por,
            habilitada_em = excluded.habilitada_em,
            revogada_por = null,
            revogada_em = null,
            updated_at = excluded.updated_at;
    else
        insert into public.tenant_activation_pilot_authorizations (
            tenant_id,
            habilitada,
            habilitada_por,
            habilitada_em,
            revogada_por,
            revogada_em,
            created_at,
            updated_at
        )
        values (
            p_tenant_id,
            false,
            null,
            null,
            v_executor,
            v_agora,
            v_agora,
            v_agora
        )
        on conflict (tenant_id)
        do update set
            habilitada = false,
            revogada_por = excluded.revogada_por,
            revogada_em = excluded.revogada_em,
            updated_at = excluded.updated_at;
    end if;

    select
        nullif(
            lower(
                btrim(
                    coalesce(
                        u.email,
                        ''
                    )
                )
            ),
            ''
        )
    into v_email
    from auth.users u
    where u.id = v_executor;

    insert into public.auditoria_sistema (
        usuario_id,
        usuario_email,
        acao,
        tabela,
        registro_id,
        descricao,
        dados
    )
    values (
        v_executor,
        v_email,
        case
            when p_habilitada
                then 'TENANT_ACTIVATION_PILOT_ENABLED'
            else 'TENANT_ACTIVATION_PILOT_REVOKED'
        end,
        'tenant_activation_pilot_authorizations',
        p_tenant_id::text,
        case
            when p_habilitada
                then 'Liberação piloto de ativação habilitada para o tenant.'
            else 'Liberação piloto de ativação revogada para o tenant.'
        end,
        jsonb_build_object(
            'tenantId',
            p_tenant_id,
            'habilitada',
            p_habilitada
        )
    );

    return public.admin_obter_liberacao_ativacao_tenant(
        p_tenant_id
    ) || jsonb_build_object(
        'alterado',
        true
    );
end;
$function$;

revoke all
on function public.admin_definir_liberacao_ativacao_tenant(uuid, boolean)
from public;

revoke all
on function public.admin_definir_liberacao_ativacao_tenant(uuid, boolean)
from anon;

grant execute
on function public.admin_definir_liberacao_ativacao_tenant(uuid, boolean)
to authenticated;

comment on table public.tenant_activation_pilot_authorizations is
    'Gate individual e reversível de ativação piloto de tenant; o gate global permanece fechado.';

comment on function public.admin_obter_liberacao_ativacao_tenant(uuid) is
    'Consulta a liberação piloto de ativação de um tenant para administrador global autenticado.';

comment on function public.admin_definir_liberacao_ativacao_tenant(uuid, boolean) is
    'Habilita ou revoga a liberação piloto de ativação de um tenant com auditoria.';

commit;