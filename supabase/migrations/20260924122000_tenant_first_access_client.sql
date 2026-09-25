-- SafeScan Brasil
-- F4 — Primeiro acesso do Administrador do Cliente.
--
-- Segurança:
-- - fluxo estritamente tenant-scoped;
-- - Conta Mestre apenas consulta/envia pelo fluxo administrativo;
-- - conclusão executada pelo próprio usuário autenticado;
-- - nenhum segredo de autenticação é persistido;
-- - tabelas sem acesso direto de anon/authenticated;
-- - RPCs SECURITY DEFINER com search_path fixo.

create table public.tenant_primeiro_acesso_admin (
    id uuid primary key default gen_random_uuid(),

    tenant_id uuid not null
        references public.tenants(id)
        on delete cascade,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    membership_id uuid not null
        references public.tenant_memberships(id)
        on delete cascade,

    email text not null,

    status text not null
        default 'nao_enviado',

    envio_tentativas integer not null
        default 0,

    ultimo_envio_em timestamptz null,
    concluido_em timestamptz null,
    ultimo_erro_codigo text null,

    criado_por uuid null
        references auth.users(id)
        on delete set null,

    atualizado_por uuid null
        references auth.users(id)
        on delete set null,

    criado_em timestamptz not null
        default now(),

    atualizado_em timestamptz not null
        default now(),

    constraint tenant_primeiro_acesso_admin_status_chk
        check (
            status in (
                'nao_enviado',
                'enviado',
                'concluido',
                'falha'
            )
        ),

    constraint tenant_primeiro_acesso_admin_tentativas_chk
        check (
            envio_tentativas >= 0
        ),

    constraint tenant_primeiro_acesso_admin_tenant_user_uq
        unique (
            tenant_id,
            user_id
        ),

    constraint tenant_primeiro_acesso_admin_membership_uq
        unique (
            membership_id
        )
);

create table public.tenant_primeiro_acesso_envios (
    id uuid primary key default gen_random_uuid(),

    tenant_id uuid not null
        references public.tenants(id)
        on delete cascade,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    membership_id uuid not null
        references public.tenant_memberships(id)
        on delete cascade,

    destinatario_email text not null,

    tentativa_numero integer not null,

    status text not null
        default 'PREPARANDO',

    erro_codigo text null,
    provedor_mensagem_id text null,

    solicitado_por uuid null
        references auth.users(id)
        on delete set null,

    solicitado_por_email text null,

    criado_em timestamptz not null
        default now(),

    enviado_em timestamptz null,

    atualizado_em timestamptz not null
        default now(),

    constraint tenant_primeiro_acesso_envios_status_chk
        check (
            status in (
                'PREPARANDO',
                'ENVIANDO',
                'ENVIADO',
                'FALHA'
            )
        ),

    constraint tenant_primeiro_acesso_envios_tentativa_chk
        check (
            tentativa_numero >= 1
        )
);

create index tenant_primeiro_acesso_admin_tenant_idx
    on public.tenant_primeiro_acesso_admin (
        tenant_id
    );

create index tenant_primeiro_acesso_envios_tenant_user_idx
    on public.tenant_primeiro_acesso_envios (
        tenant_id,
        user_id,
        criado_em desc
    );

alter table public.tenant_primeiro_acesso_admin
    enable row level security;

alter table public.tenant_primeiro_acesso_envios
    enable row level security;

revoke all
    on table public.tenant_primeiro_acesso_admin
    from public, anon, authenticated;

revoke all
    on table public.tenant_primeiro_acesso_envios
    from public, anon, authenticated;

grant select, insert, update, delete
    on table public.tenant_primeiro_acesso_admin
    to service_role;

grant select, insert, update, delete
    on table public.tenant_primeiro_acesso_envios
    to service_role;

create or replace function public.admin_listar_primeiro_acesso_tenant(
    p_tenant_id uuid
)
returns table (
    user_id uuid,
    membership_id uuid,
    email text,
    status text,
    envio_tentativas integer,
    ultimo_envio_em timestamptz,
    concluido_em timestamptz,
    ultimo_erro_codigo text
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
begin
    if auth.uid() is null then
        raise exception
            'Sessão autenticada obrigatória.'
            using errcode = '42501';
    end if;

    if public.usuario_admin_global() is not true then
        raise exception
            'Apenas a Conta Mestre pode consultar o primeiro acesso do cliente.'
            using errcode = '42501';
    end if;

    if p_tenant_id is null then
        raise exception
            'Tenant inválido.'
            using errcode = '22023';
    end if;

    if not exists (
        select 1
        from public.tenants t
        where t.id = p_tenant_id
    ) then
        raise exception
            'Tenant não localizado.'
            using errcode = '22023';
    end if;

    return query
    select
        tm.user_id,
        tm.id as membership_id,
        lower(coalesce(u.email, ''))::text as email,
        coalesce(pa.status, 'nao_enviado')::text as status,
        coalesce(pa.envio_tentativas, 0)::integer as envio_tentativas,
        pa.ultimo_envio_em,
        pa.concluido_em,
        pa.ultimo_erro_codigo
    from public.tenant_memberships tm
    join auth.users u
      on u.id = tm.user_id
    left join public.tenant_primeiro_acesso_admin pa
      on pa.tenant_id = tm.tenant_id
     and pa.user_id = tm.user_id
     and pa.membership_id = tm.id
    where tm.tenant_id = p_tenant_id
      and lower(coalesce(tm.status, '')) = 'ativo'
      and lower(coalesce(tm.papel, '')) in ('admin', 'administrador')
    order by lower(coalesce(u.email, ''));
end;
$$;

revoke all
    on function public.admin_listar_primeiro_acesso_tenant(uuid)
    from public, anon;

grant execute
    on function public.admin_listar_primeiro_acesso_tenant(uuid)
    to authenticated;

create or replace function public.cliente_concluir_primeiro_acesso(
    p_tenant_slug text
)
returns table (
    ok boolean,
    tenant_id uuid,
    tenant_slug text,
    hostname text
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
    v_user_id uuid;
    v_email text;
    v_tenant_id uuid;
    v_tenant_slug text;
    v_hostname text;
    v_membership_id uuid;
    v_primeiro_acesso_id uuid;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'Sessão de primeiro acesso não localizada.'
            using errcode = '42501';
    end if;

    if public.usuario_admin_global() is true then
        raise exception
            'Conta Mestre não participa do primeiro acesso de cliente.'
            using errcode = '42501';
    end if;

    if nullif(trim(coalesce(p_tenant_slug, '')), '') is null then
        raise exception
            'Tenant inválido.'
            using errcode = '22023';
    end if;

    select
        t.id,
        t.slug,
        d.hostname
    into
        v_tenant_id,
        v_tenant_slug,
        v_hostname
    from public.tenants t
    join public.tenant_domains d
      on d.tenant_id = t.id
     and d.principal is true
    where lower(t.slug) = lower(trim(p_tenant_slug))
      and lower(t.status) = 'ativo'
      and lower(d.status) = 'ativo'
      and d.verificado_em is not null
    limit 1;

    if v_tenant_id is null then
        raise exception
            'Ambiente do cliente não está ativo e validado.'
            using errcode = '42501';
    end if;

    select
        tm.id
    into
        v_membership_id
    from public.tenant_memberships tm
    where tm.tenant_id = v_tenant_id
      and tm.user_id = v_user_id
      and lower(coalesce(tm.status, '')) = 'ativo'
      and lower(coalesce(tm.papel, '')) in ('admin', 'administrador')
    limit 1;

    if v_membership_id is null then
        raise exception
            'Usuário não é Administrador ativo deste cliente.'
            using errcode = '42501';
    end if;

    select
        pa.id
    into
        v_primeiro_acesso_id
    from public.tenant_primeiro_acesso_admin pa
    where pa.tenant_id = v_tenant_id
      and pa.user_id = v_user_id
      and pa.membership_id = v_membership_id
      and pa.status = 'enviado'
    limit 1;

    if v_primeiro_acesso_id is null then
        raise exception
            'Convite de primeiro acesso não está válido para conclusão.'
            using errcode = '42501';
    end if;

    select lower(coalesce(u.email, ''))
    into v_email
    from auth.users u
    where u.id = v_user_id;

    update public.usuarios_permissoes_sistema ups
       set precisa_trocar_senha = false,
           atualizado_por = v_user_id,
           atualizado_por_email = v_email,
           updated_at = now()
     where ups.user_id = v_user_id
       and coalesce(ups.excluido, false) is false;

    update public.tenant_primeiro_acesso_admin pa
       set status = 'concluido',
           concluido_em = now(),
           ultimo_erro_codigo = null,
           atualizado_por = v_user_id,
           atualizado_em = now()
     where pa.id = v_primeiro_acesso_id;

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
        v_user_id,
        v_email,
        'TENANT_FIRST_ACCESS_COMPLETED',
        'tenant_primeiro_acesso_admin',
        v_tenant_id::text,
        'Primeiro acesso do Administrador do Cliente concluído.',
        jsonb_build_object(
            'tenantId', v_tenant_id,
            'tenantSlug', v_tenant_slug,
            'membershipId', v_membership_id
        )
    );

    return query
    select true, v_tenant_id, v_tenant_slug, v_hostname;
end;
$$;

revoke all
    on function public.cliente_concluir_primeiro_acesso(text)
    from public, anon;

grant execute
    on function public.cliente_concluir_primeiro_acesso(text)
    to authenticated;
