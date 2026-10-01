-- R2.10-B1-A2
-- Fundação de recursos operacionais configuráveis do Plano Base.
--
-- Recursos:
--   obras
--   aniversariantes
--   treinamentos
--   gestao_documental_sst
--
-- Compatibilidade:
--   ausência de registro = recurso ativo.
--
-- Não altera catálogo comercial, entitlements nem dados existentes.

begin;


create table public.tenant_recursos_operacionais (
    tenant_id uuid not null,
    recurso_chave text not null,
    ativo boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    created_by uuid null,
    updated_by uuid null,

    constraint tenant_recursos_operacionais_pkey
        primary key (
            tenant_id,
            recurso_chave
        ),

    constraint tenant_recursos_operacionais_tenant_id_fkey
        foreign key (tenant_id)
        references public.tenants(id)
        on delete cascade,

    constraint tenant_recursos_operacionais_created_by_fkey
        foreign key (created_by)
        references auth.users(id)
        on delete set null,

    constraint tenant_recursos_operacionais_updated_by_fkey
        foreign key (updated_by)
        references auth.users(id)
        on delete set null,

    constraint tenant_recursos_operacionais_recurso_check
        check (
            recurso_chave in (
                'obras',
                'aniversariantes',
                'treinamentos',
                'gestao_documental_sst'
            )
        )
);


comment on table public.tenant_recursos_operacionais is
    'Recursos operacionais configuráveis do Plano Base por tenant. Ausência de registro significa recurso ativo.';


alter table public.tenant_recursos_operacionais
    enable row level security;


create policy tenant_recursos_operacionais_select_proprio_tenant
on public.tenant_recursos_operacionais
for select
to authenticated
using (
    exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id =
            tenant_recursos_operacionais.tenant_id
          and tm.user_id = auth.uid()
          and tm.status = 'ativo'
    )
);


revoke all
on table public.tenant_recursos_operacionais
from public;

revoke all
on table public.tenant_recursos_operacionais
from anon;

revoke all
on table public.tenant_recursos_operacionais
from authenticated;

grant select
on table public.tenant_recursos_operacionais
to authenticated;

grant all
on table public.tenant_recursos_operacionais
to service_role;


create or replace function public.tenant_recurso_operacional_ativo(
    p_tenant_id uuid,
    p_recurso_chave text
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
    v_recurso_chave text;
    v_ativo boolean;
begin
    if
        auth.uid() is null
        or p_tenant_id is null
    then
        return false;
    end if;

    if not exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = p_tenant_id
          and tm.user_id = auth.uid()
          and tm.status = 'ativo'
    ) then
        return false;
    end if;

    v_recurso_chave :=
        lower(
            btrim(
                coalesce(
                    p_recurso_chave,
                    ''
                )
            )
        );

    if v_recurso_chave not in (
        'obras',
        'aniversariantes',
        'treinamentos',
        'gestao_documental_sst'
    ) then
        return false;
    end if;

    select tro.ativo
      into v_ativo
      from public.tenant_recursos_operacionais tro
     where tro.tenant_id = p_tenant_id
       and tro.recurso_chave = v_recurso_chave;

    if not found then
        return true;
    end if;

    return coalesce(
        v_ativo,
        true
    );
end;
$function$;


revoke all
on function public.tenant_recurso_operacional_ativo(
    uuid,
    text
)
from public;

revoke all
on function public.tenant_recurso_operacional_ativo(
    uuid,
    text
)
from anon;

grant execute
on function public.tenant_recurso_operacional_ativo(
    uuid,
    text
)
to authenticated;


create or replace function public.salvar_recurso_operacional_tenant(
    p_tenant_id uuid,
    p_recurso_chave text,
    p_ativo boolean
)
returns table (
    tenant_id uuid,
    recurso_chave text,
    ativo boolean,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
    v_actor uuid;
    v_recurso_chave text;
begin
    v_actor :=
        auth.uid();

    if v_actor is null then
        raise exception
            'Sessão autenticada obrigatória.'
            using errcode = '42501';
    end if;

    if p_tenant_id is null then
        raise exception
            'Tenant não informado.'
            using errcode = '22023';
    end if;

    if p_ativo is null then
        raise exception
            'Estado do recurso operacional não informado.'
            using errcode = '22023';
    end if;

    v_recurso_chave :=
        lower(
            btrim(
                coalesce(
                    p_recurso_chave,
                    ''
                )
            )
        );

    if v_recurso_chave not in (
        'obras',
        'aniversariantes',
        'treinamentos',
        'gestao_documental_sst'
    ) then
        raise exception
            'Recurso operacional não permitido.'
            using errcode = '22023';
    end if;

    if not exists (
        select 1
        from public.tenant_memberships tm
        join public.tenants t
          on t.id = tm.tenant_id
        where tm.tenant_id = p_tenant_id
          and tm.user_id = v_actor
          and tm.status = 'ativo'
          and tm.papel = 'administrador'
          and t.status = 'ativo'
    ) then
        raise exception
            'Somente o Administrador ativo deste ambiente pode alterar recursos operacionais.'
            using errcode = '42501';
    end if;

    return query
    insert into public.tenant_recursos_operacionais (
        tenant_id,
        recurso_chave,
        ativo,
        created_at,
        updated_at,
        created_by,
        updated_by
    )
    values (
        p_tenant_id,
        v_recurso_chave,
        p_ativo,
        now(),
        now(),
        v_actor,
        v_actor
    )
    on conflict (
        tenant_id,
        recurso_chave
    )
    do update
    set
        ativo = excluded.ativo,
        updated_at = now(),
        updated_by = v_actor
    returning
        tenant_recursos_operacionais.tenant_id,
        tenant_recursos_operacionais.recurso_chave,
        tenant_recursos_operacionais.ativo,
        tenant_recursos_operacionais.updated_at;
end;
$function$;


revoke all
on function public.salvar_recurso_operacional_tenant(
    uuid,
    text,
    boolean
)
from public;

revoke all
on function public.salvar_recurso_operacional_tenant(
    uuid,
    text,
    boolean
)
from anon;

grant execute
on function public.salvar_recurso_operacional_tenant(
    uuid,
    text,
    boolean
)
to authenticated;


commit;
