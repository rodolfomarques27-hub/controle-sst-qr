begin;

-- ============================================================
-- M11.4-I1
-- Base de memberships tenant-aware.
--
-- Escopo desta migration:
--   1. criar public.tenant_memberships;
--   2. criar RLS base somente para leitura da própria membership;
--   3. criar public.usuario_tem_acesso_tenant(uuid);
--   4. não criar tenants;
--   5. não criar domínios;
--   6. não alterar public.empresas;
--   7. não executar backfill.
-- ============================================================

do $preflight$
begin
    if to_regclass('public.tenants') is null then
        raise exception
            'M11.4-I1: tabela public.tenants ausente.';
    end if;

    if to_regclass('auth.users') is null then
        raise exception
            'M11.4-I1: tabela auth.users ausente.';
    end if;

    if to_regprocedure('public.usuario_admin_global()') is null then
        raise exception
            'M11.4-I1: função public.usuario_admin_global() ausente.';
    end if;

    if to_regprocedure('public.set_updated_at()') is null then
        raise exception
            'M11.4-I1: função public.set_updated_at() ausente.';
    end if;

    if to_regclass('public.tenant_memberships') is not null then
        raise exception
            'M11.4-I1: public.tenant_memberships já existe.';
    end if;
end
$preflight$;

create table public.tenant_memberships (
    id uuid
        primary key
        default gen_random_uuid(),

    tenant_id uuid
        not null
        references public.tenants(id)
        on delete cascade,

    user_id uuid
        not null
        references auth.users(id)
        on delete cascade,

    papel text
        not null
        default 'consulta',

    status text
        not null
        default 'pendente',

    permissoes jsonb
        not null
        default '{}'::jsonb,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    created_by uuid
        null
        default auth.uid()
        references auth.users(id)
        on delete set null,

    updated_by uuid
        null
        default auth.uid()
        references auth.users(id)
        on delete set null,

    constraint tenant_memberships_tenant_user_unique
        unique (tenant_id, user_id),

    constraint tenant_memberships_papel_check
        check (
            papel = any (
                array[
                    'administrador',
                    'gestor',
                    'tecnico_sst',
                    'auditor',
                    'consulta'
                ]::text[]
            )
        ),

    constraint tenant_memberships_status_check
        check (
            status = any (
                array[
                    'pendente',
                    'ativo',
                    'suspenso',
                    'revogado'
                ]::text[]
            )
        ),

    constraint tenant_memberships_permissoes_objeto_check
        check (
            jsonb_typeof(permissoes) = 'object'
        )
);

comment on table public.tenant_memberships is
    'Vínculo de identidade Auth com um tenant SafeScan e seu papel dentro daquele tenant.';

comment on column public.tenant_memberships.papel is
    'Papel restrito ao tenant. Não representa administrador global SafeScan.';

comment on column public.tenant_memberships.status is
    'Estado fail-closed da membership. Apenas status ativo concede acesso operacional ao tenant.';

create index tenant_memberships_user_status_idx
    on public.tenant_memberships (
        user_id,
        status
    );

create trigger tenant_memberships_set_updated_at
before update
on public.tenant_memberships
for each row
execute function public.set_updated_at();

alter table public.tenant_memberships
    enable row level security;

revoke all
on table public.tenant_memberships
from public;

revoke all
on table public.tenant_memberships
from anon;

revoke all
on table public.tenant_memberships
from authenticated;

grant select
on table public.tenant_memberships
to authenticated;

grant all
on table public.tenant_memberships
to service_role;

create policy tenant_memberships_select_propria_ou_admin_global
on public.tenant_memberships
for select
to authenticated
using (
    user_id = auth.uid()
    or public.usuario_admin_global()
);

create or replace function public.usuario_tem_acesso_tenant(
    p_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
    select
        p_tenant_id is not null
        and (
            public.usuario_admin_global()
            or exists (
                select 1
                from public.tenant_memberships tm
                join public.tenants t
                    on t.id = tm.tenant_id
                where tm.tenant_id = p_tenant_id
                  and tm.user_id = auth.uid()
                  and tm.status = 'ativo'
                  and t.status = 'ativo'
            )
        );
$function$;

comment on function public.usuario_tem_acesso_tenant(uuid) is
    'Retorna true para administrador global SafeScan ou membership ativa em tenant ativo.';

revoke all
on function public.usuario_tem_acesso_tenant(uuid)
from public;

revoke all
on function public.usuario_tem_acesso_tenant(uuid)
from anon;

grant execute
on function public.usuario_tem_acesso_tenant(uuid)
to authenticated;

grant execute
on function public.usuario_tem_acesso_tenant(uuid)
to service_role;

commit;
