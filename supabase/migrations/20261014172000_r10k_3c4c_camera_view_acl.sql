-- SafeScan Brasil | R10K-3C4C | PROPOSTA LOCAL, NAO APLICADA
-- Escopo isolado: cameras, vinculo tenant/empresa e permissao de visualizacao.
-- Sem imagem, embedding, identificacao facial ou decisao de acesso.
-- Camera ID e globalmente unico no Gateway; nao reutilizar entre tenants.
-- Habilitacoes e concessoes iniciam em FALSE. Sem backfill.
-- IMPORTANTE: service_role somente em backend confiavel, nunca no Gateway/browser.

begin;

do $preflight$
begin
    if to_regclass('public.tenants') is null
       or to_regclass('public.empresas') is null
       or to_regclass('public.tenant_memberships') is null
       or to_regclass('auth.users') is null then
        raise exception 'R10K-3C4C: dependencias tenant/empresa/usuario ausentes';
    end if;

    if to_regprocedure('public.usuario_ativo_sistema()') is null
       or to_regprocedure('public.usuario_tem_acesso_empresa(uuid)') is null then
        raise exception 'R10K-3C4C: gates de usuario/empresa ausentes';
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'empresas'
          and column_name = 'tenant_id'
          and data_type = 'uuid'
    ) then
        raise exception 'R10K-3C4C: empresas.tenant_id uuid ausente';
    end if;

    if not exists (
        select 1 from pg_catalog.pg_constraint con
        where con.conrelid = 'public.tenant_memberships'::regclass
          and con.conname = 'tenant_memberships_tenant_user_unique'
          and con.contype = 'u'
    ) then
        raise exception 'R10K-3C4C: chave unica tenant_memberships ausente';
    end if;

    if to_regclass('public.camera_ia_cameras') is not null
       or to_regclass('public.camera_ia_view_permissions') is not null
       or to_regprocedure('public.camera_ia_autorizar_visualizacao(text)') is not null then
        raise exception 'R10K-3C4C: objetos de camera ja existentes';
    end if;
end;
$preflight$;

-- Cada camera possui um unico escopo (tenant, empresa).
create table public.camera_ia_cameras (
    camera_id text primary key,
    tenant_id uuid not null
        references public.tenants(id) on delete restrict,
    empresa_id uuid not null,
    nome text not null,
    habilitada boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references auth.users(id) on delete set null,
    constraint camera_ia_cameras_id_format
        check (camera_id ~ '^[A-Za-z0-9_.:-]{1,160}$'),
    constraint camera_ia_cameras_nome_nonempty
        check (char_length(btrim(nome)) between 1 and 160),
    constraint camera_ia_cameras_empresa_tenant_fk
        foreign key (tenant_id, empresa_id)
        references public.empresas(tenant_id, id)
        on delete restrict,
    constraint camera_ia_cameras_scope_unique
        unique (camera_id, tenant_id, empresa_id)
);

-- Concessao explicita por usuario e camera; criar registro NAO concede acesso.
create table public.camera_ia_view_permissions (
    camera_id text not null,
    tenant_id uuid not null,
    empresa_id uuid not null,
    user_id uuid not null
        references auth.users(id) on delete cascade,
    habilitada boolean not null default false,
    concedida_por uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint camera_ia_view_permissions_pk
        primary key (camera_id, user_id),
    constraint camera_ia_view_permissions_camera_scope_fk
        foreign key (camera_id, tenant_id, empresa_id)
        references public.camera_ia_cameras(camera_id, tenant_id, empresa_id)
        on delete restrict,
    constraint camera_ia_view_permissions_membership_fk
        foreign key (tenant_id, user_id)
        references public.tenant_memberships(tenant_id, user_id)
        on delete restrict
);

create index camera_ia_cameras_scope_idx
    on public.camera_ia_cameras (tenant_id, empresa_id);

create index camera_ia_view_permissions_scope_active_idx
    on public.camera_ia_view_permissions (tenant_id, empresa_id, camera_id)
    where habilitada is true;

-- A reassociacao de camera/tenant/empresa exige um novo cadastro controlado.
create function public.camera_ia_block_camera_scope_change()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
    if old.camera_id is distinct from new.camera_id
       or old.tenant_id is distinct from new.tenant_id
       or old.empresa_id is distinct from new.empresa_id then
        raise exception using errcode = '42501',
            message = 'camera_ia_camera_scope_immutable';
    end if;
    return new;
end;
$fn$;

create trigger camera_ia_cameras_scope_immutable
before update of camera_id, tenant_id, empresa_id
on public.camera_ia_cameras
for each row execute function public.camera_ia_block_camera_scope_change();

create function public.camera_ia_block_permission_scope_change()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
    if old.camera_id is distinct from new.camera_id
       or old.tenant_id is distinct from new.tenant_id
       or old.empresa_id is distinct from new.empresa_id
       or old.user_id is distinct from new.user_id then
        raise exception using errcode = '42501',
            message = 'camera_ia_permission_scope_immutable';
    end if;
    return new;
end;
$fn$;

create trigger camera_ia_permissions_scope_immutable
before update of camera_id, tenant_id, empresa_id, user_id
on public.camera_ia_view_permissions
for each row execute function public.camera_ia_block_permission_scope_change();

-- Nenhuma policy publica/anon/authenticated: RLS nega acesso direto.
-- A funcao abaixo e o unico caminho de leitura concedido ao usuario.
alter table public.camera_ia_cameras enable row level security;
alter table public.camera_ia_view_permissions enable row level security;

revoke all on table
    public.camera_ia_cameras,
    public.camera_ia_view_permissions
from public, anon, authenticated;

grant select, insert, update, delete on table
    public.camera_ia_cameras,
    public.camera_ia_view_permissions
 to service_role;

revoke all on function public.camera_ia_block_camera_scope_change()
    from public, anon, authenticated;
revoke all on function public.camera_ia_block_permission_scope_change()
    from public, anon, authenticated;

-- Somente autenticacao JWT + usuario ativo + membership ativa em tenant
-- ativo + acesso a empresa + camera ativa + ACL de camera habilitada.
-- Admin global NAO dispensa ACL explicita nem membership ativa.
create function public.camera_ia_autorizar_visualizacao(p_camera_id text)
returns table (camera_id text, tenant_id uuid, empresa_id uuid)
language sql
stable
security definer
set search_path = pg_catalog
as $fn$
    select c.camera_id, c.tenant_id, c.empresa_id
    from public.camera_ia_cameras c
    join public.empresas e
      on e.id = c.empresa_id and e.tenant_id = c.tenant_id
    join public.tenants t
      on t.id = c.tenant_id and t.status = 'ativo'
    join public.tenant_memberships tm
      on tm.tenant_id = c.tenant_id
     and tm.user_id = auth.uid()
     and tm.status = 'ativo'
    join public.camera_ia_view_permissions acl
      on acl.camera_id = c.camera_id
     and acl.tenant_id = c.tenant_id
     and acl.empresa_id = c.empresa_id
     and acl.user_id = auth.uid()
     and acl.habilitada is true
    where c.camera_id = p_camera_id
      and c.habilitada is true
      and auth.uid() is not null
      and public.usuario_ativo_sistema()
      and public.usuario_tem_acesso_empresa(c.empresa_id);
$fn$;

revoke all on function public.camera_ia_autorizar_visualizacao(text)
    from public, anon;
grant execute on function public.camera_ia_autorizar_visualizacao(text)
    to authenticated;

comment on table public.camera_ia_cameras is
    'R10K-3C4C: vinculo de cameras, desativadas por padrao; nao guarda RTSP ou biometria.';
comment on table public.camera_ia_view_permissions is
    'R10K-3C4C: ACL explicita por camera e usuario, desabilitada por padrao.';
comment on function public.camera_ia_autorizar_visualizacao(text) is
    'R10K-3C4C: retorna escopo apenas para usuario com permissao individual ativa.';

commit;
