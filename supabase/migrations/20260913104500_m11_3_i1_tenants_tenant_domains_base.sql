-- ============================================================================
-- SafeScan Brasil
-- M11.3 / I1 — Estrutura-base de tenants e domínios
--
-- Objetivo:
-- - criar a fronteira estrutural de tenant/organização SafeScan;
-- - cadastrar hostnames associados a tenants;
-- - preparar domínio principal, aliases e domínios customizados;
-- - manter hostname exclusivamente como contexto/roteamento;
-- - NÃO utilizar hostname como autorização;
-- - NÃO migrar empresas, usuários ou dados existentes nesta etapa;
-- - NÃO ativar Idealiza ou qualquer novo domínio nesta etapa.
--
-- Esta migration NÃO realiza backfill.
-- Esta migration NÃO altera Supabase Auth.
-- Esta migration NÃO altera DNS/Vercel.
-- Esta migration NÃO cria memberships.
-- ============================================================================

begin;

-- ============================================================================
-- PREFLIGHT
-- ============================================================================

do $preflight$
begin
    if to_regclass('public.tenants') is not null then
        raise exception
            'Tabela public.tenants já existe. I1 abortada para evitar colisão.';
    end if;

    if to_regclass('public.tenant_domains') is not null then
        raise exception
            'Tabela public.tenant_domains já existe. I1 abortada para evitar colisão.';
    end if;
end;
$preflight$;

-- ============================================================================
-- TENANTS
-- ============================================================================

create table
    public.tenants (
        id uuid primary key
            default gen_random_uuid(),

        nome text not null,

        slug text not null,

        status text not null
            default 'rascunho',

        created_at timestamptz not null
            default now(),

        updated_at timestamptz not null
            default now(),

        constraint
            tenants_nome_check
        check (
            char_length(
                btrim(nome)
            ) between 2 and 160
        ),

        constraint
            tenants_slug_normalizado_check
        check (
            slug = lower(
                btrim(slug)
            )
        ),

        constraint
            tenants_slug_formato_check
        check (
            char_length(slug) between 2 and 63
            and slug ~
                '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
        ),

        constraint
            tenants_status_check
        check (
            status in (
                'rascunho',
                'ativo',
                'suspenso',
                'inativo'
            )
        )
    );

comment on table
    public.tenants
is
'Organizações clientes da plataforma SafeScan. Tenant é a fronteira lógica superior às empresas operacionais e não deve ser confundido com public.empresas.';

comment on column
    public.tenants.slug
is
'Identificador estável e normalizado do tenant. Pode apoiar composição de subdomínio, mas não constitui autorização.';

comment on column
    public.tenants.status
is
'Estado administrativo do tenant: rascunho, ativo, suspenso ou inativo.';

create unique index
    uq_tenants_slug
on public.tenants (
    slug
);

-- ============================================================================
-- TENANT DOMAINS
-- ============================================================================

create table
    public.tenant_domains (
        id uuid primary key
            default gen_random_uuid(),

        tenant_id uuid not null
            references public.tenants(id)
            on delete restrict,

        hostname text not null,

        tipo text not null
            default 'subdominio',

        principal boolean not null
            default false,

        status text not null
            default 'pendente',

        verificado_em timestamptz null,

        created_at timestamptz not null
            default now(),

        updated_at timestamptz not null
            default now(),

        constraint
            tenant_domains_hostname_normalizado_check
        check (
            hostname = lower(
                btrim(hostname)
            )
        ),

        constraint
            tenant_domains_hostname_tamanho_check
        check (
            char_length(hostname)
                between 3 and 253
        ),

        constraint
            tenant_domains_hostname_formato_check
        check (
            hostname ~
                '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
        ),

        constraint
            tenant_domains_tipo_check
        check (
            tipo in (
                'subdominio',
                'customizado',
                'compatibilidade'
            )
        ),

        constraint
            tenant_domains_status_check
        check (
            status in (
                'pendente',
                'ativo',
                'suspenso',
                'inativo'
            )
        ),

        constraint
            tenant_domains_ativo_exige_verificacao_check
        check (
            status <> 'ativo'
            or verificado_em is not null
        )
    );

comment on table
    public.tenant_domains
is
'Hostnames explicitamente associados a tenants. O hostname resolve contexto de tenant, mas nunca substitui membership, RLS, token ou autorização.';

comment on column
    public.tenant_domains.hostname
is
'Hostname normalizado, sem protocolo, porta, path ou query string. Deve ser globalmente único.';

comment on column
    public.tenant_domains.tipo
is
'Classificação administrativa do domínio: subdominio, customizado ou compatibilidade.';

comment on column
    public.tenant_domains.principal
is
'Indica preferência como origem pública canônica. Apenas um domínio ativo principal é permitido por tenant.';

comment on column
    public.tenant_domains.verificado_em
is
'Momento em que a propriedade/configuração do hostname foi validada. Domínio ativo exige esta evidência.';

create unique index
    uq_tenant_domains_hostname
on public.tenant_domains (
    hostname
);

create index
    idx_tenant_domains_tenant
on public.tenant_domains (
    tenant_id
);

create index
    idx_tenant_domains_tenant_status
on public.tenant_domains (
    tenant_id,
    status
);

create unique index
    uq_tenant_domains_principal_ativo
on public.tenant_domains (
    tenant_id
)
where
    principal = true
    and status = 'ativo';

-- ============================================================================
-- SEGURANÇA INICIAL
-- ============================================================================
--
-- Nesta I1 ainda NÃO existem memberships de tenant nem RPC pública
-- de resolução por hostname.
--
-- Portanto as tabelas nascem fechadas para anon/authenticated.
-- A resolução segura será criada em microetapa posterior.
-- ============================================================================

alter table
    public.tenants
enable row level security;

alter table
    public.tenant_domains
enable row level security;

revoke all
on table public.tenants
from public, anon, authenticated;

revoke all
on table public.tenant_domains
from public, anon, authenticated;

grant select, insert, update, delete
on table public.tenants
to service_role;

grant select, insert, update, delete
on table public.tenant_domains
to service_role;

-- Nenhuma policy para anon/authenticated é criada nesta etapa.
-- Isso é intencional: default deny até M11.4/membership
-- e até existir resolver controlado para hostname.

-- ============================================================================
-- POSTFLIGHT
-- ============================================================================

do $postflight$
declare
    v_tenants_rls boolean;
    v_domains_rls boolean;
begin
    if to_regclass('public.tenants') is null then
        raise exception
            'Postflight I1: public.tenants não foi criada.';
    end if;

    if to_regclass('public.tenant_domains') is null then
        raise exception
            'Postflight I1: public.tenant_domains não foi criada.';
    end if;

    select
        c.relrowsecurity
    into
        v_tenants_rls
    from pg_catalog.pg_class c
    where c.oid =
        'public.tenants'::regclass;

    if not coalesce(
        v_tenants_rls,
        false
    ) then
        raise exception
            'Postflight I1: RLS de public.tenants não está habilitado.';
    end if;

    select
        c.relrowsecurity
    into
        v_domains_rls
    from pg_catalog.pg_class c
    where c.oid =
        'public.tenant_domains'::regclass;

    if not coalesce(
        v_domains_rls,
        false
    ) then
        raise exception
            'Postflight I1: RLS de public.tenant_domains não está habilitado.';
    end if;

    if not exists (
        select 1
        from pg_catalog.pg_indexes
        where schemaname = 'public'
          and tablename = 'tenants'
          and indexname =
              'uq_tenants_slug'
    ) then
        raise exception
            'Postflight I1: índice uq_tenants_slug não localizado.';
    end if;

    if not exists (
        select 1
        from pg_catalog.pg_indexes
        where schemaname = 'public'
          and tablename = 'tenant_domains'
          and indexname =
              'uq_tenant_domains_hostname'
    ) then
        raise exception
            'Postflight I1: índice uq_tenant_domains_hostname não localizado.';
    end if;

    if not exists (
        select 1
        from pg_catalog.pg_indexes
        where schemaname = 'public'
          and tablename = 'tenant_domains'
          and indexname =
              'uq_tenant_domains_principal_ativo'
    ) then
        raise exception
            'Postflight I1: índice de domínio principal ativo não localizado.';
    end if;
end;
$postflight$;

notify pgrst, 'reload schema';

commit;